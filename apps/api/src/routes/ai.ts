import {
  aiClassifySeverityRequestSchema,
  aiExplainRequestSchema,
  aiSuggestRuleRequestSchema,
  aiSummarizeBatchRequestSchema,
} from "@repo/types";
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { AiUnavailableError, NotFoundError } from "../lib/ai.js";
import { prisma } from "../lib/prisma.js";
import { mapZodIssuesToFields } from "../lib/validation.js";
import { createAiRateLimiter } from "../middleware/rate-limit.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";
import {
  classifySeverity,
  draftReviewerNote,
  explainException,
  suggestRule,
  summarizeBatch,
} from "../services/ai.service.js";

const router = express.Router();

router.use(requireAuth);
router.use(createAiRateLimiter());

router.post(
  "/explain",
  requireRole("reviewer"),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = aiExplainRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: "BAD_REQUEST",
        error: "Invalid body",
        fields: mapZodIssuesToFields(parsed.error.issues),
      });
      return;
    }
    const actorId = req.user?.id;
    try {
      const result = await explainException(parsed.data.exceptionId, actorId);
      res.json(result);
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ code: "NOT_FOUND", error: err.message });
        return;
      }
      if (err instanceof AiUnavailableError) {
        res.json({
          code: "AI_UNAVAILABLE",
          error: err.message,
          exceptionId: parsed.data.exceptionId,
          recommendation: null,
        });
        return;
      }
      throw err;
    }
  }
);

router.post(
  "/summarize-batch",
  requireRole("reviewer"),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = aiSummarizeBatchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: "BAD_REQUEST",
        error: "Invalid body",
        fields: mapZodIssuesToFields(parsed.error.issues),
      });
      return;
    }
    const actorId = req.user?.id;
    try {
      const result = await summarizeBatch(parsed.data.batchId, actorId);
      res.json(result);
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ code: "NOT_FOUND", error: err.message });
        return;
      }
      if (err instanceof AiUnavailableError) {
        res.json({
          batchId: parsed.data.batchId,
          code: "AI_UNAVAILABLE",
          error: err.message,
          model: "unavailable",
          summary: null,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      throw err;
    }
  }
);

router.post(
  "/classify-severity",
  requireRole("reviewer"),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = aiClassifySeverityRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: "BAD_REQUEST",
        error: "Invalid body",
        fields: mapZodIssuesToFields(parsed.error.issues),
      });
      return;
    }
    const actorId = req.user?.id;
    try {
      const result = await classifySeverity(parsed.data.exceptionId, actorId);
      res.json(result);
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ code: "NOT_FOUND", error: err.message });
        return;
      }
      if (err instanceof AiUnavailableError) {
        let severity: string | null = null;
        try {
          const row = await prisma.exception.findUnique({
            select: { severity: true },
            where: { id: parsed.data.exceptionId },
          });
          severity = row?.severity ?? null;
        } catch {
          severity = null;
        }
        res.json({
          code: "AI_UNAVAILABLE",
          currentSeverity: severity ?? "medium",
          error: err.message,
          exceptionId: parsed.data.exceptionId,
          model: "unavailable",
          reasoning: null,
          suggestedSeverity: null,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      throw err;
    }
  }
);

router.post(
  "/suggest-rule",
  requireRole("data_operator", "reviewer"),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = aiSuggestRuleRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: "BAD_REQUEST",
        error: "Invalid body",
        fields: mapZodIssuesToFields(parsed.error.issues),
      });
      return;
    }
    const actorId = req.user?.id;
    try {
      const result = await suggestRule(parsed.data.prompt, actorId);
      res.json(result);
    } catch (err) {
      if (err instanceof AiUnavailableError) {
        res.json({
          code: "AI_UNAVAILABLE",
          error: err.message,
          model: "unavailable",
          promptSummary: parsed.data.prompt.slice(0, 80),
          rule: null,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      throw err;
    }
  }
);

const aiDraftNoteRequestSchema = z.object({
  exceptionId: z.string().min(1),
});

router.post(
  "/draft-note",
  requireRole("reviewer"),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = aiDraftNoteRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: "BAD_REQUEST",
        error: "Invalid body",
        fields: mapZodIssuesToFields(parsed.error.issues),
      });
      return;
    }
    const actorId = req.user?.id;
    try {
      const result = await draftReviewerNote(parsed.data.exceptionId, actorId);
      res.json(result);
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ code: "NOT_FOUND", error: err.message });
        return;
      }
      if (err instanceof AiUnavailableError) {
        res.json({
          code: "AI_UNAVAILABLE",
          error: err.message,
          exceptionId: parsed.data.exceptionId,
          note: null,
        });
        return;
      }
      throw err;
    }
  }
);

export default router;
