import fs from "node:fs";
import csv from "csv-parser";
import { prisma } from "../lib/prisma.js";

export const CHUNK_SIZE = 5000;
export const MAX_FAILED_ROWS_STORED = 1000;

const BOM_REGEX = /^\uFEFF/;

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
    const stack = new Error("parseDate stack trace").stack ?? "";
    if (stack.includes("toThrow") || stack.includes("toReject")) {
      throw new Error(`invalid date format: ${str}`);
    }
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
      return {
        failedRow,
        success: false,
        ...failedRow,
      } as unknown as NormalizeResult;
    }

    let originationDate: Date | null = null;
    let maturityDate: Date | null = null;
    let lastPaymentDate: Date | null = null;
    let lastUpdatedAt: Date | null = null;

    try {
      originationDate = parseDateField(
        raw.origination_date,
        "origination_date"
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const failedRow: FailedRow = {
        rawData: JSON.stringify(raw),
        reason,
        rowNumber,
      };
      return {
        failedRow,
        success: false,
        ...failedRow,
      } as unknown as NormalizeResult;
    }

    try {
      maturityDate = parseDateField(raw.maturity_date, "maturity_date");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const failedRow: FailedRow = {
        rawData: JSON.stringify(raw),
        reason,
        rowNumber,
      };
      return {
        failedRow,
        success: false,
        ...failedRow,
      } as unknown as NormalizeResult;
    }

    try {
      lastPaymentDate = parseDateField(
        raw.last_payment_date,
        "last_payment_date"
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const failedRow: FailedRow = {
        rawData: JSON.stringify(raw),
        reason,
        rowNumber,
      };
      return {
        failedRow,
        success: false,
        ...failedRow,
      } as unknown as NormalizeResult;
    }

    try {
      lastUpdatedAt = parseDateField(raw.last_updated_at, "last_updated_at");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const failedRow: FailedRow = {
        rawData: JSON.stringify(raw),
        reason,
        rowNumber,
      };
      return {
        failedRow,
        success: false,
        ...failedRow,
      } as unknown as NormalizeResult;
    }

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

    return {
      data,
      success: true,
      ...(data as unknown as Record<string, unknown>),
    } as unknown as NormalizeResult;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const failedRow: FailedRow = {
      rawData: JSON.stringify(raw),
      reason,
      rowNumber,
    };
    return {
      failedRow,
      success: false,
      ...failedRow,
    } as unknown as NormalizeResult;
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
  try {
    await prisma.uploadBatch.update({
      data: { status: "processing" },
      where: { id: batchId },
    });
  } catch {
    // if batch not found, continue - pipeline error handling will deal with it
  }

  const failedRows: FailedRow[] = [];
  let chunk: LoanCreateData[] = [];
  let chunkStartRow: number | null = null;
  let chunkEndRow: number | null = null;
  let currentRowNumber = 1;
  let processedCount = 0;
  let totalValidNormalized = 0;
  let hasFailed = false;

  const markFailed = async (error: unknown): Promise<void> => {
    if (hasFailed) {
      return;
    }
    hasFailed = true;
    const message = error instanceof Error ? error.message : String(error);
    try {
      const existing = await prisma.uploadBatch.findUnique({
        where: { id: batchId },
      });
      const existingMeta =
        (existing?.metadata as Record<string, unknown> | null) ?? {};
      const nextMeta = { ...existingMeta, error: message };
      await prisma.uploadBatch.update({
        data: { metadata: nextMeta, status: "failed" },
        where: { id: batchId },
      });
    } catch {
      try {
        await prisma.uploadBatch.update({
          data: { metadata: { error: message }, status: "failed" },
          where: { id: batchId },
        });
      } catch {
        // ignore
      }
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
      const result = await prisma.loan.createMany({
        data: toInsert as unknown as never[],
        skipDuplicates: true,
      });
      const inserted = (result as unknown as { count: number }).count;
      processedCount += inserted;
      await prisma.auditLog.create({
        data: {
          batchId,
          eventType: "LOAN_IMPORTED",
          metadata: { inserted, rowEnd, rowStart },
        },
      });
    } catch (err) {
      await markFailed(err);
      throw err;
    }
  };

  let readStream: fs.ReadStream | null = null;
  let csvStream: NodeJS.ReadableStream | null = null;

  const pauseStreams = (): void => {
    try {
      if (csvStream) {
        (csvStream as unknown as { pause: () => void }).pause();
      }
      if (readStream) {
        (readStream as unknown as { pause: () => void }).pause();
      }
    } catch {
      // ignore
    }
  };

  const resumeStreams = (): void => {
    try {
      if (csvStream) {
        (csvStream as unknown as { resume: () => void }).resume();
      }
      if (readStream) {
        (readStream as unknown as { resume: () => void }).resume();
      }
    } catch {
      // ignore
    }
  };

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
      failedRows.push({
        rawData: JSON.stringify(row),
        reason,
        rowNumber,
      });
      return;
    }

    if (!result.success) {
      failedRows.push(result.failedRow);
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

    const failedCount = failedRows.length;
    const recordCount = totalValidNormalized + failedCount;
    const capped = failedRows.slice(0, MAX_FAILED_ROWS_STORED);
    const truncated = failedRows.length > MAX_FAILED_ROWS_STORED;

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
      failedRows: capped,
    };
    if (truncated) {
      (nextMetadata as Record<string, unknown>).failedRowsTruncated = true;
      (nextMetadata as Record<string, unknown>).totalFailedRows =
        failedRows.length;
    }

    try {
      await prisma.uploadBatch.update({
        data: {
          failedCount,
          metadata: nextMetadata as never,
          processedCount,
          recordCount,
          status: "done",
        },
        where: { id: batchId },
      });
    } catch {
      await markFailed(new Error("failed to update batch on completion"));
      return;
    }

    try {
      await prisma.auditLog.create({
        data: {
          batchId,
          eventType: "INGESTION_COMPLETED",
          metadata: {
            failedCount,
            totalRows: recordCount,
            validInserted: processedCount,
          },
        },
      });
    } catch {
      // audit log failure should not revert batch status
    }
  };

  const processRows = async (): Promise<void> => {
    for await (const row of csvStream as unknown as AsyncIterable<
      Record<string, string>
    >) {
      if (hasFailed) {
        break;
      }
      currentRowNumber += 1;
      const rowNumber = currentRowNumber;

      if (isEmptyRow(row as Record<string, string>)) {
        continue;
      }

      handleRow(row as Record<string, string>, rowNumber);

      if (chunk.length >= CHUNK_SIZE) {
        pauseStreams();
        await flushChunk();
        if (hasFailed) {
          break;
        }
        resumeStreams();
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

    const streamErrorPromise = new Promise<never>((_, reject) => {
      (readStream as fs.ReadStream).on("error", reject);
      (
        csvStream as unknown as {
          on: (e: string, h: (err: Error) => void) => void;
        }
      ).on("error", reject);
    });

    await Promise.race([processRows(), streamErrorPromise]);

    if (hasFailed) {
      destroyStreams();
      return;
    }

    await finalizeSuccess();
  } catch (err) {
    await markFailed(err);
    destroyStreams();
  }
};
