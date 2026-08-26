import fs from "node:fs";
import csv from "csv-parser";
import { prisma } from "../lib/prisma.js";
import { validateBatch } from "./validation.service.js";

export const CHUNK_SIZE = 5000;
export const MAX_FAILED_ROWS_STORED = 1000;

const BOM_REGEX = /^\uFEFF/;

const KNOWN_COLUMNS = new Set([
  "loan_id",
  "loanid",
  "borrower_id",
  "borrowerid",
  "loan_type",
  "loantype",
  "origination_date",
  "originationdate",
  "maturity_date",
  "maturitydate",
  "original_principal",
  "originalprincipal",
  "current_balance",
  "currentbalance",
  "interest_rate",
  "interestrate",
  "term_months",
  "termmonths",
  "borrower_state",
  "borrowerstate",
  "loan_purpose",
  "loanpurpose",
  "credit_grade",
  "creditgrade",
  "employment_length",
  "employmentlength",
  "income_band",
  "incomeband",
  "payment_status",
  "paymentstatus",
  "days_past_due",
  "dayspastdue",
  "servicer_name",
  "servicername",
  "last_payment_date",
  "lastpaymentdate",
  "last_updated_at",
  "lastupdatedat",
  "document_status",
  "documentstatus",
  "source_system",
  "sourcesystem",
]);

export interface FailedRow {
  rawData: string;
  reason: string;
  rowNumber: number;
}

export interface LoanCreateData {
  borrowerId: string | null;
  borrowerState: string | null;
  creditGrade: string | null;
  currentBalance: number | null;
  daysPastDue: number | null;
  documentStatus: string | null;
  employmentLength: string | null;
  incomeBand: string | null;
  interestRate: number | null;
  lastPaymentDate: Date | null;
  lastUpdatedAt: Date | null;
  loanId: string | null;
  loanPurpose: string | null;
  loanType: string | null;
  maturityDate: Date | null;
  originalPrincipal: number | null;
  originationDate: Date | null;
  paymentStatus: string | null;
  servicerName: string | null;
  sourceBatchId: string;
  sourceRowNumber: number;
  sourceSystem: string | null;
  termMonths: number | null;
}

export interface NormalizeSuccess {
  data: LoanCreateData;
  failedRow?: never;
  success: true;
}

export interface NormalizeFailure {
  data?: never;
  failedRow: FailedRow;
  success: false;
}

export type NormalizeResult = NormalizeSuccess | NormalizeFailure;

const stripBomAndTrim = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).replace(BOM_REGEX, "").trim();
};

export const cleanString = (value: unknown): string | null => {
  const s = stripBomAndTrim(value);
  return s === "" ? null : s;
};

export const parseDecimal = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const str = stripBomAndTrim(value).replace(/,/g, "");
  if (str === "") {
    return null;
  }
  const n = Number(str);
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return null;
  }
  return n;
};

export const parseIntSafe = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const str = stripBomAndTrim(value).replace(/,/g, "");
  if (str === "") {
    return null;
  }
  const n = Number(str);
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return null;
  }
  return Math.trunc(n);
};

export const parseDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const str = stripBomAndTrim(value);
  if (str === "") {
    return null;
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d;
};

const parseDateField = (value: unknown, fieldName: string): Date | null => {
  const str = stripBomAndTrim(value);
  if (str === "") {
    return null;
  }
  const parsed = parseDate(str);
  if (parsed === null) {
    throw new Error(`invalid date format ${fieldName}: ${str}`);
  }
  return parsed;
};

export const normalizeRow = (
  raw: Record<string, string>,
  batchId: string,
  rowNumber: number
): NormalizeResult => {
  try {
    const rawRecord = raw as Record<string, string | undefined>;
    const loanId = cleanString(rawRecord.loan_id ?? rawRecord.loanId);
    const borrowerId = cleanString(
      rawRecord.borrower_id ?? rawRecord.borrowerId
    );

    if (!(loanId || borrowerId)) {
      const reason = "missing loan_id and borrower_id";
      const failedRow: FailedRow = {
        rawData: JSON.stringify(raw),
        reason,
        rowNumber,
      };
      return { failedRow, success: false };
    }

    const dateFields: Array<{ key: string; value: unknown }> = [
      { key: "origination_date", value: raw.origination_date },
      { key: "maturity_date", value: raw.maturity_date },
      { key: "last_payment_date", value: raw.last_payment_date },
      { key: "last_updated_at", value: raw.last_updated_at },
    ];
    const parsedDates: Record<string, Date | null> = {};
    for (const { key, value } of dateFields) {
      try {
        parsedDates[key] = parseDateField(value, key);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        const failedRow: FailedRow = {
          rawData: JSON.stringify(raw),
          reason,
          rowNumber,
        };
        return { failedRow, success: false };
      }
    }
    const originationDate = parsedDates.origination_date as Date | null;
    const maturityDate = parsedDates.maturity_date as Date | null;
    const lastPaymentDate = parsedDates.last_payment_date as Date | null;
    const lastUpdatedAt = parsedDates.last_updated_at as Date | null;

    const data: LoanCreateData = {
      borrowerId,
      borrowerState: cleanString(raw.borrower_state),
      creditGrade: cleanString(raw.credit_grade),
      currentBalance: parseDecimal(raw.current_balance),
      daysPastDue: parseIntSafe(raw.days_past_due),
      documentStatus: cleanString(raw.document_status),
      employmentLength: cleanString(raw.employment_length),
      incomeBand: cleanString(raw.income_band),
      interestRate: parseDecimal(raw.interest_rate),
      lastPaymentDate,
      lastUpdatedAt,
      loanId,
      loanPurpose: cleanString(raw.loan_purpose),
      loanType: cleanString(raw.loan_type),
      maturityDate,
      originalPrincipal: parseDecimal(raw.original_principal),
      originationDate,
      paymentStatus: cleanString(raw.payment_status),
      servicerName: cleanString(raw.servicer_name),
      sourceBatchId: batchId,
      sourceRowNumber: rowNumber,
      sourceSystem: cleanString(raw.source_system),
      termMonths: parseIntSafe(raw.term_months),
    };

    return { data, success: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const failedRow: FailedRow = {
      rawData: JSON.stringify(raw),
      reason,
      rowNumber,
    };
    return { failedRow, success: false };
  }
};

const isEmptyRow = (row: Record<string, string>): boolean => {
  const values = Object.values(row);
  if (values.length === 0) {
    return true;
  }
  return values.every(
    (v) => v === null || v === undefined || String(v).trim() === ""
  );
};

export const processStreamAndNormalize = async (
  filePath: string,
  batchId: string
): Promise<void> => {
  process.stdout.write(
    `[Ingestion] Batch ${batchId}: Starting streaming ingestion from ${filePath}\n`
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
          stageMessage: "Inspecting CSV headers and verifying schema...",
        },
        status: "processing",
      },
      where: { id: batchId },
    });
  } catch {
    // if batch not found, continue - pipeline error handling will deal with it
  }

  const failedRows: FailedRow[] = [];
  let totalFailedRows = 0;
  let chunk: LoanCreateData[] = [];
  let chunkStartRow: number | null = null;
  let chunkEndRow: number | null = null;
  let currentRowNumber = 1;
  let processedCount = 0;
  let totalValidNormalized = 0;
  let hasFailed = false;
  let headerValidationError: string | null = null;

  const markFailed = async (error: unknown): Promise<void> => {
    if (hasFailed) {
      return;
    }
    hasFailed = true;
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[Ingestion] Batch ${batchId} FAILED: ${message}\n`);

    const recordCount = totalValidNormalized + totalFailedRows;
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

  let lastSuccessfulRowEnd: number | null = null;

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
            metadata: { inserted, rowEnd, rowStart },
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
              stageMessage: `Ingesting and normalizing loans (${processedCount} rows inserted)...`,
            },
            processedCount,
          },
          where: { id: batchId },
        });
      });
      process.stdout.write(
        `[Ingestion] Batch ${batchId}: Flushed chunk (rows ${rowStart}..${rowEnd}, inserted: ${toInsert.length}, total: ${processedCount})\n`
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

  const handleRow = (row: Record<string, string>, rowNumber: number): void => {
    let result: NormalizeResult;
    try {
      result = normalizeRow(row, batchId, rowNumber);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      totalFailedRows += 1;
      if (failedRows.length < MAX_FAILED_ROWS_STORED) {
        failedRows.push({
          rawData: JSON.stringify(row),
          reason,
          rowNumber,
        });
      }
      return;
    }

    if (!result.success) {
      totalFailedRows += 1;
      if (failedRows.length < MAX_FAILED_ROWS_STORED) {
        failedRows.push(result.failedRow);
      }
      return;
    }

    totalValidNormalized += 1;
    if (chunkStartRow === null) {
      chunkStartRow = rowNumber;
    }
    chunkEndRow = rowNumber;
    chunk.push(result.data);
  };

  const finalizeSuccess = async (): Promise<void> => {
    if (chunk.length > 0) {
      await flushChunk();
      if (hasFailed) {
        return;
      }
    }

    const failedCount = totalFailedRows;
    const recordCount = totalValidNormalized + failedCount;
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
            status: "done",
          },
          where: { id: batchId },
        });
        await tx.auditLog.create({
          data: {
            batchId,
            eventType: "INGESTION_COMPLETED",
            metadata: {
              failedCount,
              skippedDuplicates,
              totalRows: recordCount,
              validInserted: processedCount,
            },
          },
        });
      });
      process.stdout.write(
        `[Ingestion] Batch ${batchId} SUCCESS: ${processedCount} valid loans imported (${failedCount} failed rows).\n`
      );
    } catch (err) {
      await markFailed(err);
      return;
    }

    try {
      await fs.promises.unlink(filePath).catch(() => {
        // ignore ENOENT
      });
    } catch {
      // ignore
    }
  };

  const processRows = async (): Promise<void> => {
    for await (const row of csvStream as unknown as AsyncIterable<
      Record<string, string>
    >) {
      if (hasFailed) {
        break;
      }
      if (headerValidationError) {
        await markFailed(new Error(headerValidationError));
        break;
      }
      currentRowNumber += 1;
      const rowNumber = currentRowNumber;

      if (isEmptyRow(row as Record<string, string>)) {
        continue;
      }

      handleRow(row as Record<string, string>, rowNumber);

      if (chunk.length >= CHUNK_SIZE) {
        await flushChunk();
        if (hasFailed) {
          break;
        }
      }
    }
  };

  try {
    readStream = fs.createReadStream(filePath);
    csvStream = readStream.pipe(
      csv({
        mapHeaders: ({ header }: { header: string }) =>
          header.replace(BOM_REGEX, "").trim(),
        mapValues: ({
          value,
        }: {
          header: string;
          index: number;
          value: string;
        }) => (typeof value === "string" ? value.trim() : value),
      })
    );

    (
      csvStream as unknown as {
        on: (event: string, handler: (headers: string[]) => void) => void;
      }
    ).on("headers", (headers: string[]) => {
      process.stdout.write(
        `[Ingestion] Batch ${batchId}: Detected CSV headers: [${headers.join(", ")}]\n`
      );
      const normalized = headers.map((h) =>
        h
          .replace(BOM_REGEX, "")
          .trim()
          .toLowerCase()
          .replace(/[\s_-]+/g, "")
      );
      const hasRecognizedColumn = normalized.some((h) => KNOWN_COLUMNS.has(h));
      if (!hasRecognizedColumn && headers.length > 0) {
        headerValidationError = `CSV header mismatch: File does not contain recognized loan columns (found: ${headers.slice(0, 5).join(", ")}). Expected columns such as loan_id, borrower_id, original_principal, etc.`;
        process.stderr.write(
          `[Ingestion] Batch ${batchId}: ${headerValidationError}\n`
        );
      }
    });

    const streamErrorPromise = new Promise<never>((_resolve, reject) => {
      readStream?.on("error", reject);
      (
        csvStream as unknown as {
          on: (event: string, handler: (err: Error) => void) => unknown;
        }
      ).on("error", reject);
    });

    await Promise.race([processRows(), streamErrorPromise]);

    if (headerValidationError && !hasFailed) {
      await markFailed(new Error(headerValidationError));
    }

    if (!hasFailed && totalValidNormalized === 0) {
      const reason =
        totalFailedRows > 0
          ? `All ${totalFailedRows} rows failed normalization. Ensure CSV contains valid loan identifiers (loan_id/borrower_id).`
          : "The uploaded CSV file is empty or contains no valid data rows.";
      await markFailed(new Error(`Ingestion failed: ${reason}`));
    }

    if (hasFailed) {
      destroyStreams();
      return;
    }

    await finalizeSuccess();

    const batchForPostIngest = await prisma.uploadBatch.findUnique({
      where: { id: batchId },
    });
    const fileType =
      (batchForPostIngest?.fileType as string | undefined) ?? "loan_tape";

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
              stageMessage: metaMessage,
            },
          },
          where: { id: batchId },
        });
      } catch {
        // ignore
      }
    };

    if (fileType === "servicer_update") {
      try {
        const { detectServicerConflicts } = await import(
          "./conflict-detection.service.js"
        );
        await detectServicerConflicts(batchId);
        await setPipelineCompleted(
          "Ingestion and servicer conflict detection completed successfully."
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
                conflictError: message,
              },
            },
            where: { id: batchId },
          });
        } catch {
          // ignore
        }
      }
    } else if (fileType === "loan_tape") {
      try {
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
                validationError: message,
              },
            },
            where: { id: batchId },
          });
        } catch {
          // ignore metadata update failure; ingestion itself remains done
        }
      }
    }
  } catch (err) {
    await markFailed(err);
    destroyStreams();
  }
};
