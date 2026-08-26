import express, { type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = express.Router();

const EXCEPTION_TYPES: string[] = [
  "missing_field",
  "duplicate",
  "date_error",
  "balance_error",
  "rate_out_of_range",
  "status_inconsistency",
  "stale_record",
  "conflicting_source",
  "invalid_state",
];

const SEVERITIES: string[] = ["critical", "high", "medium", "low"];

router.get(
  "/",
  requireAuth,
  async (_req: Request, res: Response): Promise<void> => {
    const [
      totalBatches,
      totalLoansImported,
      totalExceptions,
      openExceptions,
      verifiedLoans,
      byType,
      bySeverity,
      recentLogs,
    ] = await Promise.all([
      prisma.uploadBatch.count(),
      prisma.loan.count(),
      prisma.exception.count(),
      prisma.exception.count({ where: { status: "open" } }),
      prisma.verifiedLoan.count(),
      prisma.exception.groupBy({
        _count: { exceptionType: true },
        by: ["exceptionType"],
      }),
      prisma.exception.groupBy({
        _count: { severity: true },
        by: ["severity"],
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          actor: { select: { name: true } },
          createdAt: true,
          eventType: true,
          loanId: true,
        },
        take: 5,
      }),
    ]);

    const qualityScore =
      totalLoansImported > 0
        ? Math.round((verifiedLoans / totalLoansImported) * 100 * 10) / 10
        : 0;

    const exceptionsByType: Record<string, number> = Object.fromEntries(
      EXCEPTION_TYPES.map((t) => [t, 0])
    );
    for (const row of byType) {
      const key = row.exceptionType;
      if (key in exceptionsByType) {
        exceptionsByType[key] = row._count.exceptionType ?? 0;
      }
    }

    const exceptionsBySeverity: Record<string, number> = Object.fromEntries(
      SEVERITIES.map((s) => [s, 0])
    );
    for (const row of bySeverity) {
      const key = row.severity;
      if (key in exceptionsBySeverity) {
        exceptionsBySeverity[key] = row._count.severity ?? 0;
      }
    }

    const recentActivity = recentLogs.map((log) => ({
      actor: log.actor?.name ?? null,
      eventType: log.eventType,
      loanId: log.loanId ?? null,
      timestamp: log.createdAt.toISOString(),
    }));

    res.json({
      exceptionsBySeverity,
      exceptionsByType,
      overview: {
        openExceptions,
        qualityScore,
        totalBatches,
        totalExceptions,
        totalLoansImported,
        verifiedLoans,
      },
      recentActivity,
    });
  }
);

export default router;
