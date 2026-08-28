import fs from "node:fs";
import csv from "csv-parser";
import { prisma } from "../../lib/prisma.js";
import {
  type FailedRow,
  type LoanCreateData,
  MAX_FAILED_ROWS_STORED,
} from "../ingestion.service.js";
import {
  deriveDelinquency,
  gatePublicRow,
  IDX,
  mapPublicRowToLoanPart,
  PUBLIC_DATA_MIN_FIELDS,
  type PublicSourceFormat,
  parseDecimal,
  parsePublicDate,
} from "./field-map.js";

export const PUBLIC_DATA_CHUNK_SIZE = 5000;

/**
 * Incremental fold assumes contiguous loanId runs (file sorted by loanId
 * then period — true for the 757-row Fannie Mae sample and for Freddie
 * Mac acquisitions). Non-contiguous uploads (A,B,A) emit two loans for A
 * and surface as `duplicate` exceptions rather than merging — bounded
 * O(1)/run vs whole-file Map buffering.
 */
const normalizeLeadingPipe = (fields: string[]): string[] => {
  // csv-parser with `headers:false, separator:"|"` yields `0:""` for a
  // leading "|". Files without the leading pipe have 107 cols where
  // loanId sits at 0 and period at 1. Detect via 107-length + loanId-like
  // first field + parsable period at 1 and realign by prepending "".
  if (
    fields.length === 107 &&
    fields[0] !== "" &&
    parsePublicDate(fields[1]) !== null
  ) {
    return ["", ...fields];
  }
  return fields;
};

const patchBalance = (existing: LoanCreateData, fields: string[]): void => {
  const raw = fields[IDX.CURR_UPB];
  if (raw === undefined) {
    return;
  }
  const trimmed = String(raw).trim();
  if (trimmed === "" || trimmed === "0.00" || trimmed === "0") {
    return;
  }
  const n = parseDecimal(raw);
  if (n !== null && n !== 0) {
    existing.currentBalance = n;
  }
};

const patchRate = (existing: LoanCreateData, fields: string[]): void => {
  const cur = String(fields[IDX.CURR_RATE] ?? "").trim();
  const orig = String(fields[IDX.ORIG_RATE] ?? "").trim();
  const rateRaw = cur || orig;
  if (rateRaw === "") {
    return;
  }
  const r = parseDecimal(rateRaw);
  if (r !== null) {
    existing.interestRate = r;
  }
};

const patchPeriod = (existing: LoanCreateData, fields: string[]): void => {
  const periodParsed = parsePublicDate(fields[IDX.PERIOD]);
  if (periodParsed !== null) {
    existing.lastUpdatedAt = periodParsed;
  }
};

const patchDelinquency = (existing: LoanCreateData, fields: string[]): void => {
  const raw = fields[IDX.DELINQ];
  if (raw === undefined) {
    return;
  }
  const { daysPastDue, paymentStatus } = deriveDelinquency(raw);
  existing.daysPastDue = daysPastDue;
  existing.paymentStatus = paymentStatus;
};

const patchMaturity = (existing: LoanCreateData, fields: string[]): void => {
  const maturityParsed = parsePublicDate(fields[IDX.MATURITY]);
  if (maturityParsed !== null) {
    existing.maturityDate = maturityParsed;
  }
};

const patchServicer = (existing: LoanCreateData, fields: string[]): void => {
  const servicer = String(fields[IDX.SERVICER] ?? "").trim();
  if (servicer !== "") {
    existing.servicerName = servicer;
  }
};

const patchMutableFields = (
  existing: LoanCreateData,
  fields: string[]
): void => {
  patchBalance(existing, fields);
  patchRate(existing, fields);
  patchPeriod(existing, fields);
  patchDelinquency(existing, fields);
  patchMaturity(existing, fields);
  patchServicer(existing, fields);
};

export const processPublicDataIngestion = async (
  filePath: string,
  batchId: string,
  format: PublicSourceFormat
): Promise<void> => {
  process.stdout.write(
    `[PublicData] Batch ${batchId} (${format}): starting pipe ingestion from ${filePath}\n`
  );

  try {
    const existing = await prisma.uploadBatch.findUnique({
      where: { id: batchId },
    });
    const existingMeta =
      (existing?.metadata as Record<string, unknown> | null) ?? {};
    await prisma.uploadBatch.update({
      data: {
        metadata: {
          ...existingMeta,
          pipelineStage: "verifying_schema",
          pipelineStep: 2,
          publicDataFormat: format,
          stageMessage: `Inspecting ${format} pipe-delimited layout and verifying schema...`,
        },
        status: "processing",
      },
      where: { id: batchId },
    });
  } catch {
    // continue; pipeline error handling will deal with it
  }

  const failedRows: FailedRow[] = [];
  let totalFailedRows = 0;
  let chunk: LoanCreateData[] = [];
  let chunkStartRow: number | null = null;
  let chunkEndRow: number | null = null;
  let currentRowNumber = 1;
  let processedCount = 0;
  let totalSourceRows = 0;
  let totalFoldedLoans = 0;
  let totalUnmappedNonEmpty = 0;
  let hasFailed = false;

  let currentLoan: LoanCreateData | null = null;
  let currentLoanId: string | null = null;
  let currentFirstRowNumber: number | null = null;

  let lastSuccessfulRowEnd: number | null = null;

  const markFailed = async (error: unknown): Promise<void> => {
    if (hasFailed) {
      return;
    }
    hasFailed = true;
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[PublicData] Batch ${batchId} FAILED: ${message}\n`);
    const pendingForCount = currentLoan === null ? 0 : 1;
    const recordCount = totalFoldedLoans + pendingForCount + totalFailedRows;
    const truncated = totalFailedRows > MAX_FAILED_ROWS_STORED;
    let existingMeta: Record<string, unknown> = {};
    try {
      const existing = await prisma.uploadBatch.findUnique({
        where: { id: batchId },
      });
      existingMeta =
        (existing?.metadata as Record<string, unknown> | null) ?? {};
    } catch {
      // ignore
    }
    const nextMeta: Record<string, unknown> = {
      ...existingMeta,
      error: message,
      failedRows: failedRows.slice(0, MAX_FAILED_ROWS_STORED),
      pipelineStage: "failed",
      publicDataFoldedLoans: totalFoldedLoans,
      publicDataSourceRows: totalSourceRows,
      stageMessage: message,
    };
    if (truncated) {
      nextMeta.failedRowsTruncated = true;
      nextMeta.totalFailedRows = totalFailedRows;
    }
    try {
      await prisma.uploadBatch.update({
        data: {
          failedCount: totalFailedRows,
          metadata: nextMeta as never,
          recordCount,
          status: "failed",
        },
        where: { id: batchId },
      });
    } catch {
      // ignore
    }
    try {
      await fs.promises.unlink(filePath).catch(() => {
        // ignore ENOENT
      });
    } catch {
      // ignore
    }
  };

  const flushChunk = async (): Promise<void> => {
    if (chunk.length === 0) {
      return;
    }
    const toInsert = [...chunk];
    const rowStart = chunkStartRow as number;
    const rowEnd = chunkEndRow as number;
    chunk = [];
    chunkStartRow = null;
    chunkEndRow = null;
    try {
      await prisma.$transaction(async (tx) => {
        const result = await tx.loan.createMany({
          data: toInsert as unknown as never[],
          skipDuplicates: true,
        });
        const inserted = (result as unknown as { count: number }).count;
        processedCount += inserted;
        lastSuccessfulRowEnd = rowEnd;
        await tx.auditLog.create({
          data: {
            batchId,
            eventType: "LOAN_IMPORTED",
            metadata: { inserted, publicData: true, rowEnd, rowStart },
          },
        });
        const existing = await tx.uploadBatch.findUnique({
          where: { id: batchId },
        });
        const existingMeta =
          (existing?.metadata as Record<string, unknown> | null) ?? {};
        await tx.uploadBatch.update({
          data: {
            metadata: {
              ...existingMeta,
              pipelineStage: "ingesting",
              pipelineStep: 3,
              publicDataAppliedLoans: processedCount,
              stageMessage: `Ingesting public-data loans (${processedCount} folded loans inserted)...`,
            },
            processedCount,
          },
          where: { id: batchId },
        });
      });
      process.stdout.write(
        `[PublicData] Batch ${batchId}: Flushed chunk (folded rows ${rowStart}..${rowEnd}, inserted: ${toInsert.length}, total: ${processedCount})\n`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        const existing = await prisma.uploadBatch.findUnique({
          where: { id: batchId },
        });
        const existingMeta =
          (existing?.metadata as Record<string, unknown> | null) ?? {};
        await prisma.uploadBatch.update({
          data: {
            metadata: {
              ...existingMeta,
              error: message,
              lastSuccessfulRowEnd,
            },
            status: "failed",
          },
          where: { id: batchId },
        });
        hasFailed = true;
        await prisma.loan.deleteMany({ where: { sourceBatchId: batchId } });
      } catch {
        await markFailed(err);
      }
      throw err;
    }
  };

  const pushCurrentRun = async (): Promise<void> => {
    if (currentLoan === null || currentFirstRowNumber === null) {
      return;
    }
    const loan = currentLoan;
    currentLoan = null;
    currentLoanId = null;
    const firstRow = currentFirstRowNumber;
    currentFirstRowNumber = null;
    totalFoldedLoans += 1;
    if (chunkStartRow === null) {
      chunkStartRow = firstRow;
    }
    chunkEndRow = firstRow;
    chunk.push(loan);
    if (chunk.length >= PUBLIC_DATA_CHUNK_SIZE) {
      await flushChunk();
    }
  };

  const finalizeSuccess = async (): Promise<void> => {
    await pushCurrentRun();
    if (chunk.length > 0) {
      await flushChunk();
      if (hasFailed) {
        return;
      }
    }

    const failedCount = totalFailedRows;
    const recordCount = totalFoldedLoans + failedCount;
    const truncated = totalFailedRows > MAX_FAILED_ROWS_STORED;

    let existingMeta: Record<string, unknown> = {};
    try {
      const batch = await prisma.uploadBatch.findUnique({
        where: { id: batchId },
      });
      existingMeta = (batch?.metadata as Record<string, unknown> | null) ?? {};
    } catch {
      // ignore
    }

    const nextMetadata: Record<string, unknown> = {
      ...existingMeta,
      failedRows,
      pipelineStage: "validating",
      pipelineStep: 4,
      publicDataDistinctLoans: totalFoldedLoans,
      publicDataFoldedLoans: totalFoldedLoans,
      publicDataLayout:
        format === "fannie_mae" ? "fannie_mae_v1_108" : "freddie_mac_v1_108",
      publicDataSourceRows: totalSourceRows,
      publicDataUnmappedNonEmpty: totalUnmappedNonEmpty,
      stageMessage:
        "Running automated validation rules and duplicate checks...",
    };
    if (truncated) {
      (nextMetadata as Record<string, unknown>).failedRowsTruncated = true;
      (nextMetadata as Record<string, unknown>).totalFailedRows =
        totalFailedRows;
    }

    const skippedDuplicates = Math.max(
      0,
      recordCount - processedCount - failedCount
    );
    (nextMetadata as Record<string, unknown>).skippedDuplicates =
      skippedDuplicates;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.uploadBatch.update({
          data: {
            failedCount,
            metadata: nextMetadata as never,
            processedCount,
            recordCount,
            status: "processing",
          },
          where: { id: batchId },
        });
        await tx.auditLog.create({
          data: {
            batchId,
            eventType: "INGESTION_COMPLETED",
            metadata: {
              failedCount,
              publicData: true,
              publicDataFormat: format,
              publicDataSourceRows: totalSourceRows,
              skippedDuplicates,
              totalRows: recordCount,
              validInserted: processedCount,
            },
          },
        });
      });
      process.stdout.write(
        `[PublicData] Batch ${batchId} SUCCESS: ${processedCount} folded loans inserted (${failedCount} failed source rows, ${totalSourceRows} raw rows).\n`
      );
    } catch (err) {
      await markFailed(err);
    }

    try {
      await fs.promises.unlink(filePath).catch(() => {
        // ignore ENOENT
      });
    } catch {
      // ignore
    }
  };

  let readStream: fs.ReadStream | null = null;
  let csvStream: NodeJS.ReadableStream | null = null;

  const destroyStreams = (): void => {
    try {
      if (readStream) {
        readStream.destroy();
      }
      if (csvStream) {
        (csvStream as unknown as { destroy: () => void }).destroy();
      }
    } catch {
      // ignore
    }
  };

  const handleArrayRow = async (
    arr: string[],
    rowNumber: number
  ): Promise<void> => {
    const normalized = normalizeLeadingPipe(arr);
    if (
      normalized.every(
        (v) => v === null || v === undefined || String(v).trim() === ""
      )
    ) {
      return;
    }
    totalSourceRows += 1;

    // Gate accounting for unmapped tracking even on failed rows
    const gate = gatePublicRow(normalized, format);
    if (gate.unmappedNonEmpty !== undefined) {
      totalUnmappedNonEmpty += gate.unmappedNonEmpty;
    }

    const result = mapPublicRowToLoanPart(
      normalized,
      batchId,
      rowNumber,
      format
    );
    if (!result.success) {
      totalFailedRows += 1;
      if (failedRows.length < MAX_FAILED_ROWS_STORED) {
        failedRows.push(result.failedRow);
      }
      return;
    }

    const incoming = result.data;
    const incomingLoanId = incoming.loanId as string;

    if (currentLoan === null) {
      currentLoan = incoming;
      currentLoanId = incomingLoanId;
      currentFirstRowNumber = rowNumber;
      return;
    }

    if (incomingLoanId === currentLoanId) {
      // Same contiguous run — patch mutables with latest row (normalized for leading-pipe shift)
      patchMutableFields(currentLoan, normalized);
      return;
    }

    // New run — flush previous
    await pushCurrentRun();
    if (hasFailed) {
      return;
    }

    currentLoan = incoming;
    currentLoanId = incomingLoanId;
    currentFirstRowNumber = rowNumber;
  };

  try {
    readStream = fs.createReadStream(filePath);
    csvStream = readStream.pipe(
      csv({
        headers: false as unknown as string[],
        mapValues: ({
          value,
        }: {
          header: string;
          index: number;
          value: string;
        }) => (typeof value === "string" ? value.trim() : value),
        separator: "|",
      } as unknown as never)
    );

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: streaming loop with chunk flush mirrors ingestion.service.ts pattern
    const processRows = async (): Promise<void> => {
      for await (const raw of csvStream as unknown as AsyncIterable<
        Record<string, string>
      >) {
        if (hasFailed) {
          break;
        }
        currentRowNumber += 1;
        const rowNumber = currentRowNumber;
        // Convert numeric-keyed object to dense array by max index
        const keys = Object.keys(raw)
          .map((k) => Number(k))
          .filter((n) => !Number.isNaN(n));
        const maxIdx = keys.length > 0 ? Math.max(...keys) : -1;
        const arr: string[] = [];
        for (
          let i = 0;
          i <= Math.max(maxIdx, PUBLIC_DATA_MIN_FIELDS - 1);
          i += 1
        ) {
          const v = (raw as Record<string, string>)[String(i)];
          arr[i] = v ?? "";
        }
        // Ensure at least MIN_FIELDS length for gate to meaningfully run
        while (arr.length < PUBLIC_DATA_MIN_FIELDS) {
          arr.push("");
        }

        await handleArrayRow(arr, rowNumber);

        if (chunk.length >= PUBLIC_DATA_CHUNK_SIZE) {
          await flushChunk();
          if (hasFailed) {
            break;
          }
        }
      }
    };

    const streamErrorPromise = new Promise<never>((_resolve, reject) => {
      readStream?.on("error", reject);
      (
        csvStream as unknown as {
          on: (event: string, handler: (err: Error) => void) => unknown;
        }
      ).on("error", reject);
    });

    await Promise.race([processRows(), streamErrorPromise]);

    const pendingFolded = currentLoan === null ? 0 : 1;
    const effectiveFolded = totalFoldedLoans + pendingFolded;
    if (!hasFailed && effectiveFolded === 0 && totalFailedRows === 0) {
      const message =
        "The uploaded pipe-delimited file is empty or contains no valid data rows.";
      await markFailed(new Error(`Ingestion failed: ${message}`));
    } else if (!hasFailed && effectiveFolded === 0 && totalFailedRows > 0) {
      const message = `All ${totalFailedRows} rows failed normalization. Ensure file contains pipe-delimited loan data with loan_id at col 1 and reporting period at col 2.`;
      await markFailed(new Error(`Ingestion failed: ${message}`));
    }

    if (hasFailed) {
      destroyStreams();
      return;
    }

    await finalizeSuccess();

    const setPipelineCompleted = async (metaMessage: string): Promise<void> => {
      try {
        const existing = await prisma.uploadBatch.findUnique({
          where: { id: batchId },
        });
        const existingMeta =
          (existing?.metadata as Record<string, unknown> | null) ?? {};
        await prisma.uploadBatch.update({
          data: {
            metadata: {
              ...existingMeta,
              pipelineStage: "completed",
              pipelineStep: 5,
              stageMessage: metaMessage,
            },
            status: "done",
          },
          where: { id: batchId },
        });
      } catch {
        // ignore
      }
    };

    // Public-data is loan data → same validation as loan_tape
    try {
      const { validateBatch } = await import("../validation.service.js");
      await validateBatch(batchId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        const existing = await prisma.uploadBatch.findUnique({
          where: { id: batchId },
        });
        const existingMeta =
          (existing?.metadata as Record<string, unknown> | null) ?? {};
        await prisma.uploadBatch.update({
          data: {
            metadata: {
              ...existingMeta,
              pipelineStage: "completed",
              pipelineStep: 5,
              validationError: message,
            },
            status: "done",
          },
          where: { id: batchId },
        });
      } catch {
        // ignore
      }
    }
    // Ensure staged -> done even if validation path missed (defensive)
    try {
      const cur = await prisma.uploadBatch.findUnique({
        where: { id: batchId },
      });
      const meta = (cur?.metadata as Record<string, unknown> | null) ?? {};
      if (meta.pipelineStage !== "completed" && cur?.status !== "done") {
        await setPipelineCompleted(
          "Public-data ingestion and validation completed."
        );
      }
    } catch {
      // ignore
    }
  } catch (err) {
    await markFailed(err);
    destroyStreams();
  }
};
