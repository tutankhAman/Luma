import {
  computeRecordHash,
  normalizeDateString,
  normalizeDecimalString,
} from "../lib/hash.js";
import { prisma } from "../lib/prisma.js";

export class VerificationError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const buildCanonicalData = (loan: {
  borrowerId: string | null;
  borrowerState: string | null;
  creditGrade: string | null;
  currentBalance: unknown;
  daysPastDue: number | null;
  documentStatus: string | null;
  employmentLength: string | null;
  incomeBand: string | null;
  interestRate: unknown;
  lastPaymentDate: Date | null;
  loanId: string | null;
  loanPurpose: string | null;
  loanType: string | null;
  maturityDate: Date | null;
  originationDate: Date | null;
  originalPrincipal: unknown;
  paymentStatus: string | null;
  servicerName: string | null;
  sourceSystem: string | null;
  termMonths: number | null;
}): Record<string, unknown> => ({
  borrowerId: loan.borrowerId,
  borrowerState: loan.borrowerState,
  creditGrade: loan.creditGrade,
  currentBalance: normalizeDecimalString(loan.currentBalance),
  daysPastDue: loan.daysPastDue,
  documentStatus: loan.documentStatus,
  employmentLength: loan.employmentLength,
  incomeBand: loan.incomeBand,
  interestRate: normalizeDecimalString(loan.interestRate),
  lastPaymentDate: normalizeDateString(loan.lastPaymentDate),
  loanId: loan.loanId,
  loanPurpose: loan.loanPurpose,
  loanType: loan.loanType,
  maturityDate: normalizeDateString(loan.maturityDate),
  originalPrincipal: normalizeDecimalString(loan.originalPrincipal),
  originationDate: normalizeDateString(loan.originationDate),
  paymentStatus: loan.paymentStatus,
  servicerName: loan.servicerName,
  sourceSystem: loan.sourceSystem,
  termMonths: loan.termMonths,
});

export const verifyLoan = async (
  loanId: string,
  userId: string
): Promise<{
  id: string;
  loanId: string;
  recordHash: string;
  validationResult: string;
  verifiedAt: string;
  verifiedById: string;
}> => {
  const loan = await prisma.loan.findUnique({
    include: {
      exceptions: true,
      sourceBatch: { select: { fileName: true, id: true } },
      verifiedRecord: true,
    },
    where: { id: loanId },
  });

  if (!loan) {
    throw new VerificationError("Loan not found", 404, "NOT_FOUND");
  }

  if (loan.verifiedRecord) {
    throw new VerificationError(
      "Verified record already exists for this loan",
      409,
      "CONFLICT"
    );
  }

  const openExceptions = loan.exceptions.filter((e) => e.status === "open");
  if (openExceptions.length > 0) {
    throw new VerificationError(
      `${openExceptions.length} exception(s) still open — resolve all exceptions before verification`,
      409,
      "CONFLICT"
    );
  }

  const canonicalData = buildCanonicalData(loan as never);
  const recordHash = computeRecordHash(canonicalData);
  const validationResult =
    loan.exceptions.length === 0 ? "passed" : "passed_with_review";
  const reviewerDecision =
    loan.exceptions.length === 0 ? null : "approved_with_edits";
  const aiRecommendationUsed = loan.exceptions.some(
    (e) => e.aiRecommendation !== null && e.aiRecommendation !== undefined
  );
  const sourceBatchRef = `${loan.sourceBatch.fileName} (${loan.sourceBatch.id})`;

  const result = await prisma.$transaction(async (tx) => {
    const verified = await tx.verifiedLoan.create({
      data: {
        aiRecommendationUsed,
        canonicalData: canonicalData as never,
        loanId: loan.id,
        recordHash,
        reviewerDecision,
        sourceBatchRef,
        validationResult,
        verifiedById: userId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        eventType: "VERIFIED_RECORD_CREATED",
        loanId: loan.id,
        metadata: {
          recordHash,
          validationResult,
          verifiedLoanId: verified.id,
        },
        verifiedLoanId: verified.id,
      },
    });

    return verified;
  });

  return {
    id: result.id,
    loanId: result.loanId,
    recordHash: result.recordHash,
    validationResult: result.validationResult,
    verifiedAt: result.verifiedAt.toISOString(),
    verifiedById: result.verifiedById,
  };
};
