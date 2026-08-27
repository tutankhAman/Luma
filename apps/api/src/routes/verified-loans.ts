import { verifiedLoanListQuerySchema } from "@repo/types";
import express, { type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { cuidSchema, mapZodIssuesToFields } from "../lib/validation.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";

const router = express.Router();

const CUID_SCHEMA = cuidSchema;

const CSV_COLUMNS: string[] = [
  "id",
  "loanId",
  "loan_loanId",
  "loan_borrowerId",
  "canonical_borrowerId",
  "canonical_loanType",
  "canonical_originationDate",
  "canonical_maturityDate",
  "canonical_originalPrincipal",
  "canonical_currentBalance",
  "canonical_interestRate",
  "canonical_termMonths",
  "canonical_borrowerState",
  "canonical_loanPurpose",
  "canonical_creditGrade",
  "canonical_employmentLength",
  "canonical_incomeBand",
  "canonical_paymentStatus",
  "canonical_daysPastDue",
  "canonical_servicerName",
  "canonical_lastPaymentDate",
  "canonical_documentStatus",
  "canonical_sourceSystem",
  "sourceBatchRef",
  "validationResult",
  "reviewerDecision",
  "aiRecommendationUsed",
  "verifiedAt",
  "recordHash",
  "verifiedById",
];

const escapeCsvField = (value: string | null | undefined): string => {
  if (value === null || value === undefined) {
    return "";
  }
  let str = String(value);
  if (
    str.length > 0 &&
    (str[0] === "=" ||
      str[0] === "+" ||
      str[0] === "-" ||
      str[0] === "@" ||
      str[0] === "\t" ||
      str[0] === "\r")
  ) {
    str = `'${str}`;
  }
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const flattenVerifiedLoanForCsv = (vl: {
  aiRecommendationUsed: boolean;
  canonicalData: unknown;
  id: string;
  loan: { borrowerId: string | null; loanId: string | null };
  loanId: string;
  recordHash: string;
  reviewerDecision: string | null;
  sourceBatchRef: string;
  validationResult: string;
  verifiedAt: Date;
  verifiedById: string;
}): string => {
  const canonical =
    (vl.canonicalData as Record<string, unknown> | null) === null
      ? {}
      : (vl.canonicalData as Record<string, unknown>);
  const fields = [
    vl.id,
    vl.loanId,
    vl.loan.loanId,
    vl.loan.borrowerId,
    canonical.borrowerId,
    canonical.loanType,
    canonical.originationDate,
    canonical.maturityDate,
    canonical.originalPrincipal,
    canonical.currentBalance,
    canonical.interestRate,
    canonical.termMonths,
    canonical.borrowerState,
    canonical.loanPurpose,
    canonical.creditGrade,
    canonical.employmentLength,
    canonical.incomeBand,
    canonical.paymentStatus,
    canonical.daysPastDue,
    canonical.servicerName,
    canonical.lastPaymentDate,
    canonical.documentStatus,
    canonical.sourceSystem,
    vl.sourceBatchRef,
    vl.validationResult,
    vl.reviewerDecision,
    String(vl.aiRecommendationUsed),
    vl.verifiedAt.toISOString(),
    vl.recordHash,
    vl.verifiedById,
  ];
  return fields.map((v) => escapeCsvField(v as string)).join(",");
};

const flattenVerifiedLoanForJson = (vl: {
  aiRecommendationUsed: boolean;
  canonicalData: unknown;
  id: string;
  loan: { borrowerId: string | null; loanId: string | null };
  loanId: string;
  recordHash: string;
  reviewerDecision: string | null;
  sourceBatchRef: string;
  validationResult: string;
  verifiedAt: Date;
  verifiedById: string;
}): Record<string, unknown> => ({
  aiRecommendationUsed: vl.aiRecommendationUsed,
  canonicalData: vl.canonicalData,
  id: vl.id,
  loan: { borrowerId: vl.loan.borrowerId, loanId: vl.loan.loanId },
  loanId: vl.loanId,
  recordHash: vl.recordHash,
  reviewerDecision: vl.reviewerDecision,
  sourceBatchRef: vl.sourceBatchRef,
  validationResult: vl.validationResult,
  verifiedAt: vl.verifiedAt.toISOString(),
  verifiedById: vl.verifiedById,
});

const EXPORT_PAGE_SIZE = 5000;

const EXPORT_INCLUDE = {
  loan: {
    select: { borrowerId: true, loanId: true, sourceBatchId: true },
  },
} as const;

async function streamVerifiedLoanExport(
  res: Response,
  options: { batchId?: string; exportFormat: "csv" | "json" },
  where: Record<string, unknown>
): Promise<number> {
  const { exportFormat } = options;
  const whereForExport = { ...where } as Record<string, unknown>;
  const firstPage = await prisma.verifiedLoan.findMany({
    include: EXPORT_INCLUDE,
    orderBy: { verifiedAt: "desc" },
    skip: 0,
    take: EXPORT_PAGE_SIZE,
    where: whereForExport as never,
  });

  let totalExported = firstPage.length;
  const hasMore = firstPage.length === EXPORT_PAGE_SIZE;

  const dateStr = new Date().toISOString().slice(0, 10);
  if (exportFormat === "json") {
    res.setHeader("Content-Type", "application/json");
  } else {
    res.setHeader("Content-Type", "text/csv");
  }
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="verified_loans_${dateStr}.${exportFormat}"`
  );

  let first = true;
  const writeItem = (vl: unknown) => {
    if (exportFormat === "json") {
      if (!first) {
        res.write(",");
      }
      first = false;
      res.write(JSON.stringify(flattenVerifiedLoanForJson(vl as never)));
    } else {
      res.write(
        `${flattenVerifiedLoanForCsv(vl as unknown as Parameters<typeof flattenVerifiedLoanForCsv>[0])}\n`
      );
    }
  };

  if (exportFormat === "json") {
    res.write("[");
  } else {
    res.write(`${CSV_COLUMNS.join(",")}\n`);
  }
  for (const vl of firstPage) {
    writeItem(vl);
  }

  if (hasMore) {
    let offset = EXPORT_PAGE_SIZE;
    while (true) {
      const page = await prisma.verifiedLoan.findMany({
        include: EXPORT_INCLUDE,
        orderBy: { verifiedAt: "desc" },
        skip: offset,
        take: EXPORT_PAGE_SIZE,
        where: whereForExport as never,
      });
      if (page.length === 0) {
        break;
      }
      for (const vl of page) {
        writeItem(vl);
      }
      totalExported += page.length;
      if (page.length < EXPORT_PAGE_SIZE) {
        break;
      }
      offset += EXPORT_PAGE_SIZE;
    }
  }

  if (exportFormat === "json") {
    res.write("]");
  }
  res.end();
  return totalExported;
}

router.get(
  "/export",
  requireAuth,
  requireRole("data_consumer", "reviewer"),
  async (req: Request, res: Response): Promise<void> => {
    const { batchId, format } = req.query as {
      batchId?: string;
      format?: string;
    };
    const exportFormat = format === "json" ? "json" : "csv";

    if (batchId) {
      const parsed = CUID_SCHEMA.safeParse(batchId);
      if (!parsed.success) {
        res.status(400).json({
          code: "BAD_REQUEST",
          error: "Invalid batchId",
          fields: { batchId: "Must be a valid cuid" },
        });
        return;
      }
    }

    const { user } = req;
    if (!user) {
      res.status(401).json({ code: "UNAUTHENTICATED", error: "Unauthorized" });
      return;
    }

    const where: Record<string, unknown> = {};
    if (batchId) {
      where.loan = { sourceBatchId: batchId };
    }

    const totalExported = await streamVerifiedLoanExport(
      res,
      { batchId, exportFormat },
      where
    );

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        batchId: batchId ?? null,
        eventType: "RECORD_EXPORTED",
        metadata: {
          batchId: batchId ?? null,
          count: totalExported,
          format: exportFormat,
        },
      },
    });
  }
);

router.get(
  "/",
  requireAuth,
  requireRole("data_consumer", "reviewer"),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = verifiedLoanListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        code: "BAD_REQUEST",
        error: "Invalid query",
        fields: mapZodIssuesToFields(parsed.error.issues),
      });
      return;
    }

    const {
      page,
      limit,
      validationResult,
      aiRecommendationUsed,
      search,
      batchId,
    } = parsed.data;

    const where: Record<string, unknown> = {};
    if (validationResult) {
      where.validationResult = validationResult;
    }
    if (aiRecommendationUsed !== undefined) {
      where.aiRecommendationUsed = aiRecommendationUsed;
    }

    const loanWhere: Record<string, unknown> = {};
    if (search) {
      loanWhere.loanId = { contains: search, mode: "insensitive" };
    }
    if (batchId) {
      loanWhere.sourceBatchId = batchId;
    }
    if (Object.keys(loanWhere).length > 0) {
      where.loan = loanWhere;
    }

    const skip = (page - 1) * limit;

    const [total, totalImported, verifiedLoans, globalVerified] =
      await Promise.all([
        prisma.verifiedLoan.count({ where: where as never }),
        prisma.loan.count(),
        prisma.verifiedLoan.findMany({
          include: {
            loan: { select: { borrowerId: true, loanId: true } },
          },
          orderBy: { verifiedAt: "desc" },
          skip,
          take: limit,
          where: where as never,
        }),
        prisma.verifiedLoan.count(),
      ]);

    const realQualityScore =
      totalImported > 0
        ? Math.round((globalVerified / totalImported) * 100 * 10) / 10
        : 0;

    const data = verifiedLoans.map((vl) => ({
      aiRecommendationUsed: vl.aiRecommendationUsed,
      id: vl.id,
      loan: {
        borrowerId: vl.loan.borrowerId,
        loanId: vl.loan.loanId,
      },
      loanId: vl.loanId,
      recordHash: vl.recordHash,
      reviewerDecision: vl.reviewerDecision,
      sourceBatchRef: vl.sourceBatchRef,
      validationResult: vl.validationResult,
      verifiedAt: vl.verifiedAt.toISOString(),
      verifiedById: vl.verifiedById,
    }));

    res.json({
      data,
      pagination: {
        limit,
        page,
        total,
        totalPages: Math.ceil(total / limit),
      },
      qualityScore: realQualityScore,
    });
  }
);

router.get(
  "/:id",
  requireAuth,
  requireRole("data_consumer", "reviewer"),
  async (req: Request, res: Response): Promise<void> => {
    const rawId = (req.params as { id: string }).id;
    const parsedId = CUID_SCHEMA.safeParse(rawId);
    if (!parsedId.success) {
      res.status(400).json({
        code: "BAD_REQUEST",
        error: "Invalid verified loan id",
        fields: { id: "Must be a valid cuid" },
      });
      return;
    }

    const verified = await prisma.verifiedLoan.findUnique({
      include: {
        verifiedBy: { select: { name: true } },
      },
      where: { id: parsedId.data },
    });

    if (!verified) {
      res
        .status(404)
        .json({ code: "NOT_FOUND", error: "Verified loan not found" });
      return;
    }

    // Reviewer decision context + AI recommendation outcome come from the
    // loan's audit trail (same source as the audit viewer) — newest first.
    const decisionLogs = await prisma.auditLog.findMany({
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      where: {
        eventType: {
          in: ["LOAN_APPROVED", "LOAN_REJECTED", "AI_RECOMMENDATION"],
        },
        loanId: verified.loanId,
      },
    });

    const decisionLog = decisionLogs.find(
      (log) =>
        log.eventType === "LOAN_APPROVED" || log.eventType === "LOAN_REJECTED"
    );
    const aiLog = decisionLogs.find(
      (log) => log.eventType === "AI_RECOMMENDATION"
    );
    const aiMeta = (aiLog?.metadata ?? {}) as {
      aiDecision?: "accepted" | "edited" | "rejected";
    };

    // Original suggestion: latest AI_RECOMMENDATION recommendation stored on
    // the loan's exceptions, matched to the audit decision when present.
    const exceptionWithRec = await prisma.exception.findFirst({
      orderBy: { updatedAt: "desc" },
      where: {
        aiRecommendation: { not: {} },
        loanId: verified.loanId,
      },
    });

    res.json({
      aiDecision: aiMeta.aiDecision ?? null,
      aiRecommendation: (exceptionWithRec?.aiRecommendation as unknown) ?? null,
      aiRecommendationUsed: verified.aiRecommendationUsed,
      canonicalData: verified.canonicalData as unknown,
      id: verified.id,
      loanId: verified.loanId,
      recordHash: verified.recordHash,
      reviewerDecision: verified.reviewerDecision,
      reviewerNote: decisionLog
        ? String(
            (decisionLog.metadata as { note?: unknown } | null)?.note ?? ""
          ) || null
        : null,
      sourceBatchRef: verified.sourceBatchRef,
      validationResult: verified.validationResult,
      verifiedAt: verified.verifiedAt.toISOString(),
      verifiedById: verified.verifiedById,
      verifiedByName: verified.verifiedBy?.name ?? null,
    });
  }
);

export default router;
