import fs from "node:fs";
import csv from "csv-parser";
import { prisma } from "../lib/prisma.js";
import { cleanString, MAX_FAILED_ROWS_STORED } from "./ingestion.service.js";

export const MANIFEST_CHUNK_SIZE = 5000;

const BOM_REGEX = /^\uFEFF/;

export const DOCUMENT_STATUS_COMPLETE = "complete";
export const DOCUMENT_STATUS_MISSING = "missing";

/** Minimal normalized representation of one manifest CSV row. */
export interface ManifestRow {
  available: boolean | null;
  documentType: string | null;
  loanId: string;
  rowNumber: number;
}

export interface ManifestFailedRow {
  rawData: string;
  reason: string;
  rowNumber: number;
}

export type NormalizeManifestResult =
  | { failedRow?: never; row: ManifestRow; success: true }
  | { failedRow: ManifestFailedRow; row?: never; success: false };

export interface ManifestDecision {
  documentStatus: string;
  missingDocumentTypes: string[];
  sourceRowNumbers: number[];
}

export interface TapeLoanMatch {
  documentStatus: string | null;
  id: string;
  loanId: string | null;
}

/**
 * Decides the aggregate documentStatus for a tape loan given all its
 * manifest rows: any unavailable document -> missing; otherwise complete.
 */
export const decideManifestStatus = (rows: ManifestRow[]): ManifestDecision => {
  const missingDocumentTypes = rows
    .filter((r) => r.available === false)
    .map((r) => r.documentType ?? "unknown");
  return {
    documentStatus:
      missingDocumentTypes.length > 0
        ? DOCUMENT_STATUS_MISSING
        : DOCUMENT_STATUS_COMPLETE,
    missingDocumentTypes,
    sourceRowNumbers: rows.map((r) => r.rowNumber),
  };
};

/**
 * Returns orphan-cleanup metadata predicates for a replayed manifest batch.
 * Only open, unreviewed exceptions created by a PREVIOUS run of this same
 * manifest batch are eligible for deletion (G3: never touch reviewed state).
 */
export const buildOrphanCleanupWhere = (
  manifestBatchId: string
): Record<string, unknown> => ({
  exceptionType: "missing_field",
  metadata: {
    equals: manifestBatchId,
    path: ["manifestBatchId"],
  },
  reviewerId: null,
  status: "open",
});

const normalizeHeaderKey = (header: string): string =>
  header
    .replace(BOM_REGEX, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const parseAvailable = (raw: unknown): boolean | null => {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (["1", "true", "y", "yes"].includes(v)) {
    return true;
  }
  if (["0", "false", "n", "no"].includes(v)) {
    return false;
  }
  return null;
};

export const normalizeManifestRow = (
  raw: Record<string, string>,
  rowNumber: number
): NormalizeManifestResult => {
  // Normalize row keys the same way validateManifestHeaders normalizes
  // header names (review Warn fix): a file passing the header gate with
  // "Loan Id,Document Type,Available" must not fail every row because
  // get() compared against raw BOM-stripped keys only.
  const norm = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [normalizeHeaderKey(key), value])
  );
  const get = (...keys: string[]): string => {
    for (const key of keys) {
      const value = norm[key];
      if (value !== undefined && value !== "") {
        return value;
      }
    }
    return "";
  };

  const rawLoanId = cleanString(get("loanid"));
  const documentType = cleanString(get("documenttype", "document"));
  const availableRaw = get("available", "isavailable", "availability");
  const available = parseAvailable(availableRaw);

  const fail = (reason: string): NormalizeManifestResult => ({
    failedRow: {
      rawData: JSON.stringify(raw),
      reason,
      rowNumber,
    },
    success: false,
  });

  if (!rawLoanId) {
    return fail("missing loan_id in manifest row");
  }

  if (available === null) {
    return fail(
      `invalid available value "${availableRaw}" (use true/false/y/n/1/0)`
    );
  }

  return {
    row: {
      available,
      documentType,
      loanId: rawLoanId,
      rowNumber,
    },
    success: true,
  };
};

const REQUIRED_LOAN_ID_HEADERS = new Set(["loanid", "loan_id"]);
const REQUIRED_AVAILABLE_HEADERS = new Set([
  "available",
  "isavailable",
  "documentavailable",
  "availability",
]);

export const validateManifestHeaders = (headers: string[]): string | null => {
  if (headers.length === 0) {
    return null;
  }
  const normalized = headers.map(normalizeHeaderKey);
  const hasLoanId = normalized.some((h) => REQUIRED_LOAN_ID_HEADERS.has(h));
  const hasAvailable = normalized.some((h) =>
    REQUIRED_AVAILABLE_HEADERS.has(h)
  );

  const missingColumns: string[] = [];
  if (!hasLoanId) {
    missingColumns.push("loan_id");
  }
  if (!hasAvailable) {
    missingColumns.push("available");
  }

  if (missingColumns.length > 0) {
    return `CSV header mismatch: file is missing required manifest column(s): ${missingColumns.join(", ")} (found: ${headers.slice(0, 5).join(", ")})`;
  }
  return null;
};

interface ApplyOutcome {
  loansUpdated: number;
  /** businessIds presented whose count minus matched tape rows (duplicates/single-row windows make these differ) */
  matchedLoanIds: number;
  missingLoansCreated: number;
  unmatchedBusinessIds: number;
}

/**
 * Splits complete per-loanId groups into windows whose combined row count
 * stays under MANIFEST_CHUNK_SIZE (E3). A loan's rows are never split:
 * a single larger-than-window group occupies its own window intact.
 */
export const buildApplyWindows = (groups: ManifestRow[][]): ManifestRow[][] => {
  const windows: ManifestRow[][] = [];
  let current: ManifestRow[] = [];
  for (const group of groups) {
    if (
      current.length > 0 &&
      current.length + group.length > MANIFEST_CHUNK_SIZE
    ) {
      windows.push(current);
      current = [];
    }
    for (const row of group) {
      current.push(row);
    }
  }
  if (current.length > 0) {
    windows.push(current);
  }
  return windows;
};

interface ChunkOperations {
  exceptionsToCreate: Array<{
    exceptionType: string;
    field: string;
    loanId: string;
    message: string;
    metadata: Record<string, unknown>;
    severity: string;
    status: string;
  }>;
  fieldEditedAuditLogs: Array<{
    eventType: string;
    loanId: string;
    metadata: Record<string, unknown>;
  }>;
  loansByTargetStatus: Map<string, string[]>;
}

const prepareChunkOperations = (
  byLoanId: Map<string, ManifestRow[]>,
  tapeByLoanId: Map<string, TapeLoanMatch>,
  manifestBatchId: string
): ChunkOperations => {
  const exceptionsToCreate: ChunkOperations["exceptionsToCreate"] = [];
  const loansByTargetStatus = new Map<string, string[]>();
  const fieldEditedAuditLogs: ChunkOperations["fieldEditedAuditLogs"] = [];

  for (const [businessId, rows] of byLoanId) {
    const tapeRow = tapeByLoanId.get(businessId);
    if (!tapeRow) {
      continue;
    }

    const decision = decideManifestStatus(rows);

    if (
      decision.documentStatus === DOCUMENT_STATUS_MISSING &&
      decision.missingDocumentTypes.length > 0
    ) {
      exceptionsToCreate.push({
        exceptionType: "missing_field",
        field: "documentStatus",
        loanId: tapeRow.id,
        message: `documents missing per manifest: ${decision.missingDocumentTypes.join(", ")}`,
        metadata: {
          manifestBatchId,
          missingDocumentTypes: decision.missingDocumentTypes,
          sourceRowNumbers: decision.sourceRowNumbers,
        },
        severity: "medium",
        status: "open",
      });
    }

    if (tapeRow.documentStatus === decision.documentStatus) {
      continue;
    }

    const oldValue =
      tapeRow.documentStatus === null ? null : String(tapeRow.documentStatus);

    const statusGroup = loansByTargetStatus.get(decision.documentStatus);
    if (statusGroup) {
      statusGroup.push(tapeRow.id);
    } else {
      loansByTargetStatus.set(decision.documentStatus, [tapeRow.id]);
    }

    fieldEditedAuditLogs.push({
      eventType: "FIELD_EDITED",
      loanId: tapeRow.id,
      metadata: {
        field: "documentStatus",
        manifestBatchId,
        newValue: decision.documentStatus,
        oldValue,
        reason: `document_manifest applied: ${decision.missingDocumentTypes.length} missing of ${rows.length} entries`,
        source: "system:document_manifest",
      },
    });
  }

  return { exceptionsToCreate, fieldEditedAuditLogs, loansByTargetStatus };
};

const applyChunk = async (
  manifestBatchId: string,
  chunkRows: ManifestRow[]
): Promise<ApplyOutcome> => {
  // Group every manifest row belonging to the same tape business loanId,
  // preserving first-seen order and merging duplicates across the chunk.
  const byLoanId = new Map<string, ManifestRow[]>();
  for (const row of chunkRows) {
    const existing = byLoanId.get(row.loanId);
    if (existing) {
      existing.push(row);
    } else {
      byLoanId.set(row.loanId, [row]);
    }
  }

  const businessIds = [...byLoanId.keys()];
  if (businessIds.length === 0) {
    return {
      loansUpdated: 0,
      matchedLoanIds: 0,
      missingLoansCreated: 0,
      unmatchedBusinessIds: 0,
    };
  }

  const tapeRows = (await prisma.loan.findMany({
    orderBy: { createdAt: "desc" },
    select: { documentStatus: true, id: true, loanId: true },
    where: {
      loanId: { in: businessIds },
      sourceBatch: { fileType: "loan_tape" },
    },
  })) as unknown as TapeLoanMatch[];

  const tapeByLoanId = new Map<string, TapeLoanMatch>();
  for (const row of tapeRows) {
    const key = row.loanId?.trim();
    if (key && !tapeByLoanId.has(key)) {
      tapeByLoanId.set(key, row);
    }
  }

  let loansUpdated = 0;
  let missingLoansCreated = 0;

  const { exceptionsToCreate, fieldEditedAuditLogs, loansByTargetStatus } =
    prepareChunkOperations(byLoanId, tapeByLoanId, manifestBatchId);

  await prisma.$transaction(
    async (tx) => {
      for (const [targetStatus, ids] of loansByTargetStatus) {
        if (ids.length > 0) {
          await tx.loan.updateMany({
            data: { documentStatus: targetStatus },
            where: { id: { in: ids } },
          });
          loansUpdated += ids.length;
        }
      }

      if (fieldEditedAuditLogs.length > 0) {
        await tx.auditLog.createMany({
          data: fieldEditedAuditLogs as never,
        });
      }

      if (exceptionsToCreate.length > 0) {
        const createdExceptions = await tx.exception.createManyAndReturn({
          data: exceptionsToCreate as never,
          select: { id: true, loanId: true },
        });

        if (createdExceptions.length > 0) {
          await tx.auditLog.createMany({
            data: createdExceptions.map((exc) => ({
              eventType: "EXCEPTION_CREATED",
              exceptionId: exc.id,
              loanId: exc.loanId,
              metadata: {
                exceptionType: "missing_field",
                manifestBatchId,
              },
            })) as never,
          });
        }
        missingLoansCreated = createdExceptions.length;
      }
    },
    { maxWait: 10_000, timeout: 30_000 }
  );

  return {
    loansUpdated,
    matchedLoanIds: tapeByLoanId.size,
    missingLoansCreated,
    unmatchedBusinessIds: businessIds.length - tapeByLoanId.size,
  };
};

export const processDocumentManifest = async (
  filePath: string,
  batchId: string
): Promise<void> => {
  process.stdout.write(
    `[Manifest] Batch ${batchId}: starting document-manifest processing from ${filePath}\n`
  );

  let hasFailed = false;
  let readStream: fs.ReadStream | null = null;
  let csvStream: NodeJS.ReadableStream | null = null;

  const destroyStreams = (): void => {
    try {
      readStream?.destroy();
      (csvStream as unknown as { destroy: () => void } | null)?.destroy();
    } catch {
      // ignore
    }
  };

  const markFailed = async (
    error: unknown,
    opts?: { isRetryable?: boolean }
  ): Promise<void> => {
    if (hasFailed) {
      return;
    }
    hasFailed = true;
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[Manifest] Batch ${batchId} FAILED: ${message}\n`);

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
            manifestStage: "failed",
            stageMessage: message,
          },
          status: "failed",
        },
        where: { id: batchId },
      });
    } catch {
      // best-effort
    }

    const isRetryable =
      opts?.isRetryable ?? !message.includes("header mismatch");
    // Preserve filePath for retryable failures so failed replay can reopen the file;
    // only unlink for non-retryable validation errors.
    if (!isRetryable) {
      await fs.promises.unlink(filePath).catch(() => {
        // ignore ENOENT
      });
    }
  };

  try {
    const batch = await prisma.uploadBatch.findUnique({
      where: { id: batchId },
    });
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    const existingMeta =
      (batch.metadata as Record<string, unknown> | null) ?? {};

    if (existingMeta.manifestStage === "done") {
      process.stdout.write(
        `[Manifest] Batch ${batchId}: already completed, skipping.\n`
      );
      return;
    }

    // Replay guard: wipe orphans left behind by an interrupted previous run.
    // Replay guard (review Warn fix): "applying" catches hard crashes;
    // "failed" catches soft failures (markFailed overwrites the stage), so
    // a re-invoked failed batch also cleans its orphans before re-applying.
    // buildOrphanCleanupWhere is idempotent and scoped to open + unreviewed
    // same-batch exceptions (S3), and missing-exceptions are re-ensured
    // every run, so cleanup on "failed" cannot lose reviewed state.
    if (
      existingMeta.manifestStage === "applying" ||
      existingMeta.manifestStage === "failed"
    ) {
      try {
        await prisma.exception.deleteMany({
          where: buildOrphanCleanupWhere(batchId) as never,
        });
      } catch {
        // best-effort cleanup
      }
    }

    await prisma.uploadBatch.update({
      data: {
        metadata: {
          ...existingMeta,
          manifestStage: "applying",
          pipelineStage: "applying_manifest",
          stageMessage: "Applying document availability to matched loans...",
        },
        status: "processing",
      },
      where: { id: batchId },
    });

    let headerValidationError: string | null = null;
    const failedRows: ManifestFailedRow[] = [];
    let totalFailedRows = 0;
    let totalRows = 0;
    let totalApplied = 0;
    let totalMissingExceptioned = 0;
    let totalUnmatched = 0;

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
      headerValidationError = validateManifestHeaders(headers);
      if (headerValidationError) {
        process.stderr.write(
          `[Manifest] Batch ${batchId}: ${headerValidationError}\n`
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

    // Whole-file per-loanId accumulation (review Block fix): the verdict for
    // a loan must be decided from ALL its manifest rows. A size-triggered
    // chunk flush could split one loanId's rows across two windows and flip
    // documentStatus based on a partial group. Rows are tiny triples, so the
    // O(distinct-loan rows) buffer is bounded and safe; only applyChunk
    // windows stay capped at MANIFEST_CHUNK_SIZE.
    const rowsByLoanId = new Map<string, ManifestRow[]>();
    let currentRowNumber = 1;

    const processRows = async (): Promise<void> => {
      for await (const raw of csvStream as unknown as AsyncIterable<
        Record<string, string>
      >) {
        currentRowNumber += 1;
        const rowNumber = currentRowNumber - 1;

        if (
          Object.values(raw).every(
            (v) => v === null || v === undefined || String(v).trim() === ""
          )
        ) {
          continue;
        }

        totalRows += 1;
        const result = normalizeManifestRow(raw, rowNumber);

        if (!result.success) {
          totalFailedRows += 1;
          if (failedRows.length < MAX_FAILED_ROWS_STORED) {
            failedRows.push(result.failedRow);
          }
          continue;
        }

        const loanRows = rowsByLoanId.get(result.row.loanId);
        if (loanRows) {
          loanRows.push(result.row);
        } else {
          rowsByLoanId.set(result.row.loanId, [result.row]);
        }
      }
    };

    await Promise.race([processRows(), streamErrorPromise]);
    // Contain a late stream rejection: if processRows wins the race the
    // rejected streamErrorPromise would otherwise surface as an unhandled
    // process-level rejection.
    streamErrorPromise.catch(() => {
      // already handled by the race above
    });

    if (headerValidationError) {
      throw new Error(headerValidationError);
    }

    // Apply complete per-loan groups in capped windows (E3): feed applyChunk
    // batches of whole loanId groups whose combined rows stay under
    // MANIFEST_CHUNK_SIZE.
    for (const window of buildApplyWindows([...rowsByLoanId.values()])) {
      const outcome = await applyChunk(batchId, window);
      totalApplied += outcome.loansUpdated;
      totalMissingExceptioned += outcome.missingLoansCreated;
      totalUnmatched += outcome.unmatchedBusinessIds;
    }

    const finalMetaSource = await prisma.uploadBatch.findUnique({
      where: { id: batchId },
    });
    const finalMetaBase =
      (finalMetaSource?.metadata as Record<string, unknown> | null) ?? {};

    await prisma.$transaction(async (tx) => {
      await tx.uploadBatch.update({
        data: {
          failedCount: totalFailedRows,
          metadata: {
            ...finalMetaBase,
            failedRows: failedRows as unknown as never[],
            manifestAppliedLoans: totalApplied,
            manifestMissingExceptioned: totalMissingExceptioned,
            manifestStage: "done",
            manifestTotalRows: totalRows,
            manifestUnmatchedBusinessIds: totalUnmatched,
            pipelineStage: "completed",
            stageMessage: "Document manifest processed successfully.",
          },
          recordCount: totalRows,
          status: "done",
        },
        where: { id: batchId },
      });
      await tx.auditLog.create({
        data: {
          batchId,
          eventType: "INGESTION_COMPLETED",
          metadata: {
            appliedLoans: totalApplied,
            failedRows: totalFailedRows,
            manifestType: true,
            missingExceptioned: totalMissingExceptioned,
            totalRows,
          },
        },
      });
    });

    process.stdout.write(
      `[Manifest] Batch ${batchId} SUCCESS: ${totalRows} rows, ${totalApplied} loans updated, ${totalMissingExceptioned} missing-document exceptions.\n`
    );
    destroyStreams();
    await fs.promises.unlink(filePath).catch(() => {
      // ignore ENOENT
    });
  } catch (err) {
    await markFailed(err);
    destroyStreams();
  }
};
