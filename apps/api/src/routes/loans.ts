import { loanFieldsPatchBodySchema, loanListQuerySchema } from "@repo/types";
import express, { type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { cuidSchema, mapZodIssuesToFields } from "../lib/validation.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";
import {
  VerificationError,
  verifyLoan,
} from "../services/verification.service.js";

const router = express.Router();

const CUID_SCHEMA = cuidSchema;

const LOAN_FIELD_MAP: Record<string, string> = {
  borrowerState: "borrowerState",
  creditGrade: "creditGrade",
  currentBalance: "currentBalance",
  documentStatus: "documentStatus",
  interestRate: "interestRate",
  paymentStatus: "paymentStatus",
  servicerName: "servicerName",
};

const coerceFieldValue = (field: string, value: string): unknown => {
  if (field === "currentBalance" || field === "interestRate") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return null;
    }
    const num = Number(trimmed);
    if (Number.isNaN(num) || !Number.isFinite(num) || num < 0) {
      return null;
    }
    return trimmed;
  }
  return value;
};

router.get(
  "/",
  requireAuth,
  requireRole("data_operator", "reviewer", "data_consumer"),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = loanListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        code: "BAD_REQUEST",
        error: "Invalid query",
        fields: mapZodIssuesToFields(parsed.error.issues),
      });
      return;
    }

    const { user } = req;
    if (!user) {
      res.status(401).json({ code: "UNAUTHENTICATED", error: "Unauthorized" });
      return;
    }

    const { page, limit, batchId, validationStatus, search } = parsed.data;
    const where: Record<string, unknown> = {};
    if (batchId) {
      where.sourceBatchId = batchId;
    }
    if (validationStatus) {
      where.validationStatus = validationStatus;
    }
    if (search) {
      where.OR = [
        { id: { equals: search } },
        { loanId: { contains: search, mode: "insensitive" } },
        { borrowerId: { contains: search, mode: "insensitive" } },
        { servicerName: { contains: search, mode: "insensitive" } },
      ];
    }
    // Data consumers only ever see verified loans — deny-by-default scoping.
    if (user.role === "data_consumer") {
      where.verifiedRecord = { isNot: null };
    }

    const skip = (page - 1) * limit;

    const [total, loans] = await Promise.all([
      prisma.loan.count({ where: where as never }),
      prisma.loan.findMany({
        include: {
          _count: { select: { exceptions: true } },
          sourceBatch: { select: { fileName: true, id: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        where: where as never,
      }),
    ]);

    const data = loans.map(
      (loan: {
        _count: { exceptions: number };
        borrowerId: string | null;
        borrowerState: string | null;
        currentBalance: unknown;
        id: string;
        interestRate: unknown;
        loanId: string | null;
        loanType: string | null;
        originalPrincipal: unknown;
        paymentStatus: string | null;
        sourceBatch: { fileName: string; id: string };
        sourceRowNumber: number;
        validationStatus: string;
      }) => ({
        borrowerId: loan.borrowerId,
        borrowerState: loan.borrowerState,
        currentBalance:
          loan.currentBalance !== null && loan.currentBalance !== undefined
            ? String(loan.currentBalance)
            : null,
        exceptionCount: loan._count.exceptions,
        id: loan.id,
        interestRate:
          loan.interestRate !== null && loan.interestRate !== undefined
            ? String(loan.interestRate)
            : null,
        loanId: loan.loanId,
        loanType: loan.loanType,
        originalPrincipal:
          loan.originalPrincipal !== null &&
          loan.originalPrincipal !== undefined
            ? String(loan.originalPrincipal)
            : null,
        paymentStatus: loan.paymentStatus,
        sourceBatch: {
          fileName: loan.sourceBatch.fileName,
          id: loan.sourceBatch.id,
        },
        sourceRowNumber: loan.sourceRowNumber,
        validationStatus: loan.validationStatus,
      })
    );

    res.json({
      data,
      pagination: {
        limit,
        page,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

router.get(
  "/:id",
  requireAuth,
  requireRole("data_operator", "reviewer", "data_consumer"),
  async (req: Request, res: Response): Promise<void> => {
    const rawId = (req.params as { id: string }).id;
    const parsedId = CUID_SCHEMA.safeParse(rawId);
    if (!parsedId.success) {
      res.status(400).json({
        code: "BAD_REQUEST",
        error: "Invalid loan id",
        fields: { id: "Must be a valid cuid" },
      });
      return;
    }

    const { user } = req;
    if (!user) {
      res.status(401).json({ code: "UNAUTHENTICATED", error: "Unauthorized" });
      return;
    }

    const loan = await prisma.loan.findUnique({
      include: {
        exceptions: {
          orderBy: { createdAt: "asc" },
        },
        sourceBatch: { select: { fileName: true, id: true } },
        verifiedRecord: {
          select: {
            id: true,
            recordHash: true,
            validationResult: true,
            verifiedAt: true,
            verifiedById: true,
          },
        },
      },
      where: { id: parsedId.data },
    });

    if (!loan) {
      res.status(404).json({ code: "NOT_FOUND", error: "Loan not found" });
      return;
    }

    // Data consumers may only inspect loans that have been verified
    // (api-contract.md: "data_consumer (verified only)").
    if (user.role === "data_consumer" && !loan.verifiedRecord) {
      res.status(403).json({
        code: "FORBIDDEN",
        error: "Loan has not been verified",
      });
      return;
    }

    res.json({
      borrowerId: loan.borrowerId,
      borrowerState: loan.borrowerState,
      creditGrade: loan.creditGrade,
      currentBalance:
        loan.currentBalance !== null && loan.currentBalance !== undefined
          ? String(loan.currentBalance)
          : null,
      daysPastDue: loan.daysPastDue,
      documentStatus: loan.documentStatus,
      employmentLength: loan.employmentLength,
      exceptions: loan.exceptions.map((exc) => ({
        aiRecommendation: (exc.aiRecommendation as unknown) ?? null,
        createdAt: exc.createdAt.toISOString(),
        exceptionType: exc.exceptionType,
        field: exc.field,
        id: exc.id,
        message: exc.message,
        metadata: (exc.metadata as unknown) ?? null,
        severity: exc.severity,
        status: exc.status,
      })),
      id: loan.id,
      importStatus: loan.importStatus,
      incomeBand: loan.incomeBand,
      interestRate:
        loan.interestRate !== null && loan.interestRate !== undefined
          ? String(loan.interestRate)
          : null,
      lastPaymentDate: loan.lastPaymentDate
        ? loan.lastPaymentDate.toISOString()
        : null,
      lastUpdatedAt: loan.lastUpdatedAt
        ? loan.lastUpdatedAt.toISOString()
        : null,
      loanId: loan.loanId,
      loanPurpose: loan.loanPurpose,
      loanType: loan.loanType,
      maturityDate: loan.maturityDate ? loan.maturityDate.toISOString() : null,
      originalPrincipal:
        loan.originalPrincipal !== null && loan.originalPrincipal !== undefined
          ? String(loan.originalPrincipal)
          : null,
      originationDate: loan.originationDate
        ? loan.originationDate.toISOString()
        : null,
      paymentStatus: loan.paymentStatus,
      servicerName: loan.servicerName,
      sourceBatch: {
        fileName: loan.sourceBatch.fileName,
        id: loan.sourceBatch.id,
      },
      sourceRowNumber: loan.sourceRowNumber,
      sourceSystem: loan.sourceSystem,
      termMonths: loan.termMonths,
      validationStatus: loan.validationStatus,
      verifiedRecord: loan.verifiedRecord
        ? {
            id: loan.verifiedRecord.id,
            recordHash: loan.verifiedRecord.recordHash,
            validationResult: loan.verifiedRecord.validationResult,
            verifiedAt: loan.verifiedRecord.verifiedAt.toISOString(),
            verifiedById: loan.verifiedRecord.verifiedById,
          }
        : null,
    });
  }
);

router.patch(
  "/:id/fields",
  requireAuth,
  requireRole("reviewer"),
  async (req: Request, res: Response): Promise<void> => {
    const rawId = (req.params as { id: string }).id;
    const parsedId = CUID_SCHEMA.safeParse(rawId);
    if (!parsedId.success) {
      res.status(400).json({
        code: "BAD_REQUEST",
        error: "Invalid loan id",
        fields: { id: "Must be a valid cuid" },
      });
      return;
    }

    const parsedBody = loanFieldsPatchBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({
        code: "BAD_REQUEST",
        error: "Invalid body",
        fields: mapZodIssuesToFields(parsedBody.error.issues),
      });
      return;
    }

    const { user } = req;
    if (!user) {
      res.status(401).json({ code: "UNAUTHENTICATED", error: "Unauthorized" });
      return;
    }

    const loanId = parsedId.data;
    const { fields, reason } = parsedBody.data;

    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      res.status(404).json({ code: "NOT_FOUND", error: "Loan not found" });
      return;
    }

    const dataToUpdate: Record<string, unknown> = {};
    const updatedFields: string[] = [];
    const editsForAudit: Array<{
      field: string;
      newValue: string;
      oldValue: string | null;
    }> = [];

    for (const [field, newValue] of Object.entries(fields)) {
      const dbField = LOAN_FIELD_MAP[field];
      if (!dbField) {
        res.status(400).json({
          code: "BAD_REQUEST",
          error: `Field ${field} is not editable`,
          fields: { [field]: "Not editable" },
        });
        return;
      }
      if (field === "currentBalance" || field === "interestRate") {
        const coerced = coerceFieldValue(field, newValue);
        if (coerced === null) {
          res.status(400).json({
            code: "BAD_REQUEST",
            error: `Invalid numeric value for ${field}`,
            fields: { [field]: "Must be a valid non-negative number" },
          });
          return;
        }
      }
      const oldRaw = (loan as unknown as Record<string, unknown>)[dbField];
      const oldValue =
        oldRaw === null || oldRaw === undefined ? null : String(oldRaw);
      dataToUpdate[dbField] = coerceFieldValue(field, newValue);
      updatedFields.push(field);
      editsForAudit.push({ field, newValue, oldValue });
    }

    const updated = (await prisma.$transaction(async (tx) => {
      const result = await tx.loan.update({
        data: dataToUpdate,
        where: { id: loanId },
      });

      await tx.auditLog.createMany({
        data: editsForAudit.map((edit) => ({
          actorId: user.id,
          eventType: "FIELD_EDITED",
          loanId,
          metadata: {
            field: edit.field,
            newValue: edit.newValue,
            oldValue: edit.oldValue,
            reason,
          },
        })),
      });

      return result;
    })) as unknown as { updatedAt: Date; id: string };

    res.json({
      id: updated.id,
      updatedAt: updated.updatedAt.toISOString(),
      updatedFields,
    });
  }
);

router.post(
  "/:id/verify",
  requireAuth,
  requireRole("reviewer"),
  async (req: Request, res: Response): Promise<void> => {
    const rawId = (req.params as { id: string }).id;
    const parsedId = CUID_SCHEMA.safeParse(rawId);
    if (!parsedId.success) {
      res.status(400).json({
        code: "BAD_REQUEST",
        error: "Invalid loan id",
        fields: { id: "Must be a valid cuid" },
      });
      return;
    }

    const { user } = req;
    if (!user) {
      res.status(401).json({ code: "UNAUTHENTICATED", error: "Unauthorized" });
      return;
    }

    try {
      const verified = await verifyLoan(parsedId.data, user.id);
      res.status(201).json({ verifiedLoan: verified });
    } catch (err) {
      if (err instanceof VerificationError) {
        res.status(err.statusCode).json({ code: err.code, error: err.message });
        return;
      }
      throw err;
    }
  }
);

export default router;
