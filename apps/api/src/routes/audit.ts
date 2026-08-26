import { auditListQuerySchema } from "@repo/types";
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { normalizeRole } from "../lib/roles.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = express.Router();

const CUID_SCHEMA = z.string().cuid2().or(z.string().cuid());

router.get(
  "/:loanId",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const rawLoanId = (req.params as { loanId: string }).loanId;
    const parsedId = CUID_SCHEMA.safeParse(rawLoanId);
    if (!parsedId.success) {
      res.status(400).json({
        code: "BAD_REQUEST",
        error: "Invalid loanId",
        fields: { loanId: "Must be a valid cuid" },
      });
      return;
    }

    const parsedQuery = auditListQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({
        code: "BAD_REQUEST",
        error: "Invalid query",
        fields: Object.fromEntries(
          parsedQuery.error.issues.map((issue) => [
            issue.path.join("."),
            issue.message,
          ])
        ),
      });
      return;
    }

    const { page, limit } = parsedQuery.data;
    const loanId = parsedId.data;

    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      res.status(404).json({ code: "NOT_FOUND", error: "Loan not found" });
      return;
    }

    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where: { loanId } }),
      prisma.auditLog.findMany({
        include: {
          actor: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        where: { loanId },
      }),
    ]);

    const data = logs.map((log) => {
      const actorRole = log.actor ? normalizeRole(log.actor.role) : null;
      return {
        actor: log.actor
          ? {
              id: log.actor.id,
              name: log.actor.name,
              role: actorRole ?? "data_consumer",
            }
          : null,
        createdAt: log.createdAt.toISOString(),
        eventType: log.eventType,
        id: log.id,
        metadata: (log.metadata as unknown) ?? null,
      };
    });

    res.json({
      data,
      loanId,
      pagination: {
        limit,
        page,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

export default router;
