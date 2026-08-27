import { prisma } from "../lib/prisma.js";

export const CHUNK_SIZE = 5000;

const COMPARABLE_FIELDS = [
  "originalPrincipal",
  "currentBalance",
  "interestRate",
  "termMonths",
  "daysPastDue",
  "paymentStatus",
  "borrowerState",
  "creditGrade",
  "servicerName",
  "documentStatus",
] as const;

type ComparableField = (typeof COMPARABLE_FIELDS)[number];

const numericFields = new Set<string>([
  "originalPrincipal",
  "currentBalance",
  "interestRate",
  "termMonths",
  "daysPastDue",
]);

const normalizeForCompare = (value: unknown, field: string): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const raw = String(value).trim();
  if (raw === "") {
    return null;
  }
  if (numericFields.has(field)) {
    const n = Number(raw.replace(/,/g, ""));
    if (Number.isNaN(n) || !Number.isFinite(n)) {
      return raw.toLowerCase();
    }
    return String(n);
  }
  return raw.toLowerCase();
};

const valuesDiffer = (a: unknown, b: unknown, field: string): boolean => {
  const na = normalizeForCompare(a, field);
  const nb = normalizeForCompare(b, field);
  if (na === null && nb === null) {
    return false;
  }
  if (na === null || nb === null) {
    return true;
  }
  return na !== nb;
};

type ServicerLoanRow = {
  id: string;
  loanId: string | null;
  sourceRowNumber: number;
} & Record<ComparableField, unknown>;

type TapeLoanRow = {
  id: string;
  loanId: string | null;
} & Record<ComparableField, unknown>;

export const detectServicerConflicts = async (
  servicerBatchId: string
): Promise<{
  exceptionsCreated: number;
  loansAffected: number;
  matchedRows: number;
  unmatchedLoanIds: number;
}> => {
  const batch = await prisma.uploadBatch.findUnique({
    where: { id: servicerBatchId },
  });
  if (!batch) {
    throw new Error(`Batch ${servicerBatchId} not found`);
  }
  if (batch.fileType !== "servicer_update") {
    return {
      exceptionsCreated: 0,
      loansAffected: 0,
      matchedRows: 0,
      unmatchedLoanIds: 0,
    };
  }

  const existingMeta = (batch.metadata as Record<string, unknown> | null) ?? {};

  if (existingMeta.conflictStage === "done") {
    process.stdout.write(
      `[Conflict] Batch ${servicerBatchId}: already completed, skipping.\n`
    );
    return {
      exceptionsCreated:
        (existingMeta.conflictExceptionsCreated as number | undefined) ?? 0,
      loansAffected:
        (existingMeta.conflictLoansAffected as number | undefined) ?? 0,
      matchedRows:
        (existingMeta.conflictMatchedRows as number | undefined) ?? 0,
      unmatchedLoanIds:
        (existingMeta.conflictUnmatchedLoanIds as number | undefined) ?? 0,
    };
  }

  if (existingMeta.conflictStage === "detecting") {
    process.stdout.write(
      `[Conflict] Batch ${servicerBatchId}: cleaning orphaned conflicts from prior run.\n`
    );
    try {
      await prisma.exception.deleteMany({
        where: {
          exceptionType: "conflicting_source",
          metadata: {
            equals: servicerBatchId,
            path: ["conflictBatchId"],
          },
          reviewerId: null,
          status: "open",
        } as never,
      });
    } catch {
      // best-effort cleanup
    }
  }

  try {
    await prisma.uploadBatch.update({
      data: {
        metadata: {
          ...existingMeta,
          conflictStage: "detecting",
        } as never,
      },
      where: { id: servicerBatchId },
    });
  } catch {
    // proceed anyway
  }

  const servicerSelect: Record<string, boolean> = {
    id: true,
    loanId: true,
    sourceRowNumber: true,
  };
  for (const f of COMPARABLE_FIELDS) {
    servicerSelect[f] = true;
  }

  const tapeSelect: Record<string, boolean> = {
    id: true,
    loanId: true,
  };
  for (const f of COMPARABLE_FIELDS) {
    tapeSelect[f] = true;
  }

  let skip = 0;
  let totalExceptions = 0;
  let totalLoansAffected = 0;
  let totalMatched = 0;
  let totalUnmatched = 0;
  const affectedLoanIds = new Set<string>();

  while (true) {
    const servicerRows = (await prisma.loan.findMany({
      orderBy: { sourceRowNumber: "asc" },
      select: servicerSelect as never,
      skip,
      take: CHUNK_SIZE,
      where: { sourceBatchId: servicerBatchId },
    })) as unknown as ServicerLoanRow[];

    if (servicerRows.length === 0) {
      break;
    }

    const loanIds = [
      ...new Set(
        servicerRows
          .map((r) => r.loanId?.trim())
          .filter((id): id is string => Boolean(id))
      ),
    ];

    if (loanIds.length === 0) {
      skip += CHUNK_SIZE;
      if (servicerRows.length < CHUNK_SIZE) {
        break;
      }
      continue;
    }

    const tapeRows = (await prisma.loan.findMany({
      orderBy: { createdAt: "desc" },
      select: tapeSelect as never,
      where: {
        loanId: { in: loanIds },
        sourceBatch: { fileType: "loan_tape" },
      },
    })) as unknown as TapeLoanRow[];

    const tapeByLoanId = new Map<string, TapeLoanRow>();
    for (const row of tapeRows) {
      const key = row.loanId?.trim();
      if (key && !tapeByLoanId.has(key)) {
        tapeByLoanId.set(key, row);
      }
    }

    const exceptionsToCreate: Array<{
      exceptionType: string;
      field: string;
      loanId: string;
      message: string;
      metadata: Record<string, unknown>;
      severity: string;
      status: string;
    }> = [];

    for (const sRow of servicerRows) {
      const loanId = sRow.loanId?.trim();
      if (!loanId) {
        continue;
      }
      const tapeRow = tapeByLoanId.get(loanId);
      if (!tapeRow) {
        totalUnmatched += 1;
        continue;
      }
      totalMatched += 1;

      for (const field of COMPARABLE_FIELDS) {
        const sVal = sRow[field];
        const tVal = tapeRow[field];
        if (!valuesDiffer(tVal, sVal, field)) {
          continue;
        }

        const tStr =
          tVal === null || tVal === undefined ? "null" : String(tVal);
        const sStr =
          sVal === null || sVal === undefined ? "null" : String(sVal);

        exceptionsToCreate.push({
          exceptionType: "conflicting_source",
          field,
          loanId: tapeRow.id,
          message: `servicer_update reports ${field}='${sStr}' but loan tape has '${tStr}'`,
          metadata: {
            conflictBatchId: servicerBatchId,
            conflictField: field,
            sourceFileType: "servicer_update",
            sourceLoanRow: sRow.id,
            sourceRowNumber: sRow.sourceRowNumber,
            sourceValue: sVal === undefined ? null : sVal,
            targetValue: tVal === undefined ? null : tVal,
          },
          severity: "high",
          status: "open",
        });
      }
    }

    if (exceptionsToCreate.length > 0) {
      await prisma.$transaction(async (tx) => {
        const createdExceptions = await tx.exception.createManyAndReturn({
          data: exceptionsToCreate as never,
          select: { id: true, loanId: true },
          skipDuplicates: false,
        });

        if (createdExceptions.length > 0) {
          await tx.auditLog.createMany({
            data: createdExceptions.map((exc) => ({
              eventType: "EXCEPTION_CREATED",
              exceptionId: exc.id,
              loanId: exc.loanId,
              metadata: {
                conflictBatchId: servicerBatchId,
                exceptionType: "conflicting_source",
              },
            })) as never,
          });
        }
      });

      totalExceptions += exceptionsToCreate.length;
      for (const e of exceptionsToCreate) {
        affectedLoanIds.add(e.loanId);
      }
    }

    skip += CHUNK_SIZE;
    if (servicerRows.length < CHUNK_SIZE) {
      break;
    }
  }

  totalLoansAffected = affectedLoanIds.size;

  try {
    const fresh = await prisma.uploadBatch.findUnique({
      where: { id: servicerBatchId },
    });
    const freshMeta = (fresh?.metadata as Record<string, unknown> | null) ?? {};
    await prisma.uploadBatch.update({
      data: {
        metadata: {
          ...freshMeta,
          conflictExceptionsCreated: totalExceptions,
          conflictLoansAffected: totalLoansAffected,
          conflictMatchedRows: totalMatched,
          conflictStage: "done",
          conflictUnmatchedLoanIds: totalUnmatched,
          pipelineStage: "completed",
          stageMessage:
            "Ingestion and servicer conflict detection completed successfully.",
        } as never,
        status: "done",
      },
      where: { id: servicerBatchId },
    });
  } catch {
    // best-effort
  }

  process.stdout.write(
    `[Conflict] Batch ${servicerBatchId}: ${totalExceptions} conflicting_source exceptions across ${totalLoansAffected} loans (${totalMatched} matched, ${totalUnmatched} unmatched).\n`
  );

  return {
    exceptionsCreated: totalExceptions,
    loansAffected: totalLoansAffected,
    matchedRows: totalMatched,
    unmatchedLoanIds: totalUnmatched,
  };
};
