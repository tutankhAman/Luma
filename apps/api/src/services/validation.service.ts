import { prisma } from "../lib/prisma.js";
import {
  defaultThresholds,
  type ValidationThresholds,
} from "../lib/validation-thresholds.js";

export const VALIDATION_CHUNK_SIZE = 5000;

export interface ValidationException {
  exceptionType: string;
  field: string | null;
  message: string;
  severity: string;
}

const VALID_US_STATES = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
]);

interface LoanLike {
  borrowerId: string | null;
  borrowerState: string | null;
  currentBalance: unknown;
  daysPastDue: number | null;
  documentStatus: string | null;
  id: string;
  interestRate: unknown;
  lastUpdatedAt: Date | null;
  loanId: string | null;
  maturityDate: Date | null;
  originalPrincipal: unknown;
  originationDate: Date | null;
  paymentStatus: string | null;
  sourceBatchId: string;
}

const decimalToNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return value;
  }
  const n = Number(String(value));
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return null;
  }
  return n;
};

const toPrincipalKey = (value: unknown): string => {
  const num = decimalToNumber(value);
  if (num !== null) {
    return String(num);
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
};

const buildBorrowerComboKey = (
  borrowerId: string,
  originalPrincipal: unknown,
  originationDate: Date | null
): string =>
  `${borrowerId}|${toPrincipalKey(originalPrincipal)}|${originationDate?.toISOString() ?? ""}`;

const checkDateRules = (
  loan: LoanLike,
  exceptions: ValidationException[]
): void => {
  if (!(loan.originationDate && loan.maturityDate)) {
    return;
  }
  if (loan.maturityDate.getTime() >= loan.originationDate.getTime()) {
    return;
  }
  exceptions.push({
    exceptionType: "date_error",
    field: "maturityDate",
    message: "maturity_date is before origination_date",
    severity: "high",
  });
};

const checkBalanceRules = (
  principal: number | null,
  balance: number | null,
  exceptions: ValidationException[]
): void => {
  if (principal !== null && principal < 0) {
    exceptions.push({
      exceptionType: "balance_error",
      field: "originalPrincipal",
      message: "original_principal is negative",
      severity: "critical",
    });
  }
  if (
    principal !== null &&
    balance !== null &&
    principal >= 0 &&
    balance > principal
  ) {
    exceptions.push({
      exceptionType: "balance_error",
      field: "currentBalance",
      message: "current_balance exceeds original_principal",
      severity: "critical",
    });
  }
};

const checkRateRule = (
  loan: LoanLike,
  thresholds: ValidationThresholds,
  exceptions: ValidationException[]
): void => {
  const rate = decimalToNumber(loan.interestRate);
  if (rate === null) {
    return;
  }
  if (
    rate >= thresholds.interestRateMin &&
    rate <= thresholds.interestRateMax
  ) {
    return;
  }
  exceptions.push({
    exceptionType: "rate_out_of_range",
    field: "interestRate",
    message: `interest_rate ${rate} outside range [${thresholds.interestRateMin}, ${thresholds.interestRateMax}]`,
    severity: "high",
  });
};

const checkPaymentRules = (
  loan: LoanLike,
  balance: number | null,
  exceptions: ValidationException[]
): void => {
  if (loan.paymentStatus && loan.daysPastDue !== null) {
    const status = loan.paymentStatus.toLowerCase();
    const dpd = loan.daysPastDue;
    if (status === "current" && dpd > 0) {
      exceptions.push({
        exceptionType: "status_inconsistency",
        field: "paymentStatus",
        message: "payment_status current but days_past_due > 0",
        severity: "medium",
      });
    } else if ((status === "delinquent" || status === "late") && dpd === 0) {
      exceptions.push({
        exceptionType: "status_inconsistency",
        field: "paymentStatus",
        message: `payment_status ${status} but days_past_due is 0`,
        severity: "medium",
      });
    }
  }

  if (
    loan.paymentStatus &&
    loan.paymentStatus.toLowerCase() === "closed" &&
    balance !== null &&
    balance > 0
  ) {
    exceptions.push({
      exceptionType: "status_inconsistency",
      field: "currentBalance",
      message: "loan is closed but current_balance > 0",
      severity: "medium",
    });
  }
};

export const runPerLoanRules = (
  loan: LoanLike,
  thresholds: ValidationThresholds = defaultThresholds
): ValidationException[] => {
  const exceptions: ValidationException[] = [];

  if (!loan.loanId) {
    exceptions.push({
      exceptionType: "missing_field",
      field: "loanId",
      message: "loan_id is required",
      severity: "critical",
    });
  }

  checkDateRules(loan, exceptions);

  const principal = decimalToNumber(loan.originalPrincipal);
  const balance = decimalToNumber(loan.currentBalance);
  checkBalanceRules(principal, balance, exceptions);
  checkRateRule(loan, thresholds, exceptions);
  checkPaymentRules(loan, balance, exceptions);

  if (!loan.documentStatus) {
    exceptions.push({
      exceptionType: "missing_field",
      field: "documentStatus",
      message: "document_status is required",
      severity: "high",
    });
  }

  if (loan.lastUpdatedAt) {
    const daysAgo =
      (Date.now() - loan.lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo > thresholds.staleDaysThreshold) {
      exceptions.push({
        exceptionType: "stale_record",
        field: "lastUpdatedAt",
        message: `record is stale (last_updated_at ${Math.floor(daysAgo)} days ago)`,
        severity: "low",
      });
    }
  }

  if (loan.borrowerState) {
    const state = loan.borrowerState.toUpperCase().trim();
    if (!VALID_US_STATES.has(state)) {
      exceptions.push({
        exceptionType: "invalid_state",
        field: "borrowerState",
        message: `borrower_state ${loan.borrowerState} is not a valid US state code`,
        severity: "medium",
      });
    }
  }

  return exceptions;
};

interface BatchDuplicateSets {
  borrowerCounts: Map<string, number>;
  duplicateCombos: Set<string>;
  duplicateLoanIds: Set<string>;
  spikedBorrowers: Set<string>;
}

const collectBatchDuplicateSets = async (
  batchId: string,
  thresholds: ValidationThresholds
): Promise<BatchDuplicateSets> => {
  const loanIdCounts = new Map<string, number>();
  const borrowerComboCounts = new Map<string, number>();
  const borrowerCounts = new Map<string, number>();
  let countSkip = 0;
  // biome-ignore lint/suspicious/noUnnecessaryConditions: chunked scan breaks on empty batch
  while (true) {
    const loans: {
      borrowerId: string | null;
      id: string;
      loanId: string | null;
      originalPrincipal: unknown;
      originationDate: Date | null;
    }[] = (await prisma.loan.findMany({
      orderBy: { sourceRowNumber: "asc" },
      select: {
        borrowerId: true,
        id: true,
        loanId: true,
        originalPrincipal: true,
        originationDate: true,
      },
      skip: countSkip,
      take: VALIDATION_CHUNK_SIZE,
      where: { sourceBatchId: batchId },
    })) as unknown as {
      borrowerId: string | null;
      id: string;
      loanId: string | null;
      originalPrincipal: unknown;
      originationDate: Date | null;
    }[];
    if (loans.length === 0) {
      break;
    }
    for (const loan of loans) {
      if (loan.loanId) {
        loanIdCounts.set(loan.loanId, (loanIdCounts.get(loan.loanId) ?? 0) + 1);
      }
      if (loan.borrowerId) {
        const comboKey = buildBorrowerComboKey(
          loan.borrowerId,
          loan.originalPrincipal,
          loan.originationDate
        );
        borrowerComboCounts.set(
          comboKey,
          (borrowerComboCounts.get(comboKey) ?? 0) + 1
        );
        borrowerCounts.set(
          loan.borrowerId,
          (borrowerCounts.get(loan.borrowerId) ?? 0) + 1
        );
      }
    }
    if (loans.length < VALIDATION_CHUNK_SIZE) {
      break;
    }
    countSkip += VALIDATION_CHUNK_SIZE;
  }
  return {
    borrowerCounts,
    duplicateCombos: new Set(
      [...borrowerComboCounts.entries()]
        .filter(([, c]) => c > 1)
        .map(([k]) => k)
    ),
    duplicateLoanIds: new Set(
      [...loanIdCounts.entries()].filter(([, c]) => c > 1).map(([id]) => id)
    ),
    spikedBorrowers: new Set(
      [...borrowerCounts.entries()]
        .filter(([, c]) => c > thresholds.duplicateBorrowerThreshold)
        .map(([id]) => id)
    ),
  };
};

export const runBatch = async (
  batchId: string,
  thresholds: ValidationThresholds = defaultThresholds
): Promise<{ exceptionCount: number; loanCount: number }> => {
  let exceptionCount = 0;
  let loanCount = 0;

  const duplicateSets = await collectBatchDuplicateSets(batchId, thresholds);

  let skip = 0;
  // biome-ignore lint/suspicious/noUnnecessaryConditions: chunked pagination breaks on empty
  while (true) {
    const chunkResult = await processValidationChunk(
      batchId,
      skip,
      duplicateSets,
      thresholds
    );
    if (chunkResult === null) {
      break;
    }
    exceptionCount += chunkResult.exceptionCount;
    loanCount += chunkResult.loanCount;
    if (chunkResult.isLast) {
      break;
    }
    skip += VALIDATION_CHUNK_SIZE;
  }

  return { exceptionCount, loanCount };
};

const processValidationChunk = async (
  batchId: string,
  skip: number,
  duplicateSets: BatchDuplicateSets,
  thresholds: ValidationThresholds
): Promise<{
  exceptionCount: number;
  isLast: boolean;
  loanCount: number;
} | null> => {
  const loans = await prisma.loan.findMany({
    orderBy: [{ sourceRowNumber: "asc" }, { id: "asc" }],
    skip,
    take: VALIDATION_CHUNK_SIZE,
    where: { sourceBatchId: batchId },
  });
  if (loans.length === 0) {
    return null;
  }

  const { duplicateLoanIds, duplicateCombos, spikedBorrowers, borrowerCounts } =
    duplicateSets;

  const allExceptions: Array<{
    exceptionType: string;
    field: string | null;
    loanId: string;
    message: string;
    severity: string;
  }> = [];
  const loanStatusUpdates: Array<{ id: string; status: string }> = [];

  for (const loan of loans) {
    const perLoan = runPerLoanRules(loan as unknown as LoanLike, thresholds);

    if (loan.loanId && duplicateLoanIds.has(loan.loanId)) {
      perLoan.push({
        exceptionType: "duplicate",
        field: "loanId",
        message: `duplicate loan_id ${loan.loanId}`,
        severity: "critical",
      });
    }

    if (loan.borrowerId) {
      const comboKey = buildBorrowerComboKey(
        loan.borrowerId,
        loan.originalPrincipal,
        loan.originationDate
      );
      if (duplicateCombos.has(comboKey)) {
        perLoan.push({
          exceptionType: "duplicate",
          field: "borrowerId",
          message: `duplicate borrower combo ${loan.borrowerId}`,
          severity: "critical",
        });
      }
      if (spikedBorrowers.has(loan.borrowerId)) {
        perLoan.push({
          exceptionType: "duplicate",
          field: "borrowerId",
          message: `borrower ${loan.borrowerId} appears ${borrowerCounts.get(loan.borrowerId)} times (threshold ${thresholds.duplicateBorrowerThreshold})`,
          severity: "critical",
        });
      }
    }

    if (perLoan.length > 0) {
      for (const exc of perLoan) {
        allExceptions.push({
          exceptionType: exc.exceptionType,
          field: exc.field,
          loanId: loan.id,
          message: exc.message,
          severity: exc.severity,
        });
      }
      loanStatusUpdates.push({ id: loan.id, status: "failed" });
    } else {
      loanStatusUpdates.push({ id: loan.id, status: "passed" });
    }
  }

  await persistValidationChunk(
    batchId,
    loans.length,
    allExceptions,
    loanStatusUpdates
  );

  return {
    exceptionCount: allExceptions.length,
    isLast: loans.length < VALIDATION_CHUNK_SIZE,
    loanCount: loans.length,
  };
};

const persistValidationChunk = async (
  batchId: string,
  loansLength: number,
  allExceptions: Array<{
    exceptionType: string;
    field: string | null;
    loanId: string;
    message: string;
    severity: string;
  }>,
  loanStatusUpdates: Array<{ id: string; status: string }>
): Promise<void> => {
  const failedIds = loanStatusUpdates
    .filter((u) => u.status === "failed")
    .map((u) => u.id);
  const passedIds = loanStatusUpdates
    .filter((u) => u.status === "passed")
    .map((u) => u.id);

  await prisma.$transaction(async (tx) => {
    if (allExceptions.length > 0) {
      await tx.exception.createMany({
        data: allExceptions.map((exc) => ({
          exceptionType: exc.exceptionType,
          field: exc.field,
          loanId: exc.loanId,
          message: exc.message,
          severity: exc.severity,
          status: "open",
        })),
      });
    }
    if (failedIds.length > 0) {
      await (
        tx.loan as unknown as {
          updateMany: (args: unknown) => Promise<unknown>;
        }
      ).updateMany({
        data: { validationStatus: "failed" },
        where: { id: { in: failedIds } },
      });
    }
    if (passedIds.length > 0) {
      await (
        tx.loan as unknown as {
          updateMany: (args: unknown) => Promise<unknown>;
        }
      ).updateMany({
        data: { validationStatus: "passed" },
        where: { id: { in: passedIds } },
      });
    }
    await tx.auditLog.create({
      data: {
        batchId,
        eventType: "VALIDATION_RUN",
        metadata: {
          exceptionCount: allExceptions.length,
          loanCount: loansLength,
        },
      },
    });
  });
};

export const validateBatch = async (batchId: string): Promise<void> => {
  process.stdout.write(
    `[Validation] Batch ${batchId}: Starting automated validation checks...\n`
  );
  try {
    const batchBefore = await prisma.uploadBatch.findUnique({
      where: { id: batchId },
    });
    const metaBefore =
      (batchBefore?.metadata as Record<string, unknown> | null) ?? {};
    await prisma.uploadBatch.update({
      data: {
        metadata: {
          ...metaBefore,
          pipelineStage: "validating",
          pipelineStep: 4,
          stageMessage:
            "Running automated validation rules and duplicate checks...",
        },
      },
      where: { id: batchId },
    });
  } catch {
    // ignore
  }

  const existingExceptions = await prisma.exception.count({
    where: { loan: { sourceBatchId: batchId } },
  });
  if (existingExceptions > 0) {
    process.stdout.write(
      `[Validation] Batch ${batchId}: Exceptions already computed (${existingExceptions}), skipping.\n`
    );
  } else {
    await runBatch(batchId);
  }

  try {
    const batchAfter = await prisma.uploadBatch.findUnique({
      where: { id: batchId },
    });
    const metaAfter =
      (batchAfter?.metadata as Record<string, unknown> | null) ?? {};
    await prisma.uploadBatch.update({
      data: {
        metadata: {
          ...metaAfter,
          pipelineStage: "completed",
          pipelineStep: 5,
          stageMessage:
            "Ingestion and automated validation completed successfully.",
        },
      },
      where: { id: batchId },
    });
  } catch {
    // ignore
  }

  process.stdout.write(
    `[Validation] Batch ${batchId}: Completed validation checks.\n`
  );
};
