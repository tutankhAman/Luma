import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type BatchSummary,
  batchStatusSchema,
  type CreateUploadResponse,
  fileTypeSchema,
  type GetBatchResponse,
  listUploadsQuerySchema,
} from "@repo/types";
import express, { type Request, type Response } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";
import { processStreamAndNormalize } from "../services/ingestion.service.js";

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const UPLOAD_DIR = path.join(os.tmpdir(), "luma-uploads");

const ensureUploadDir = (): void => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
};

ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safeName);
  },
});

const upload = multer({
  limits: { fileSize: MAX_FILE_SIZE },
  storage,
});

const router = express.Router();

router.use(requireAuth, requireRole("data_operator"));

router.post(
  "/",
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    const { file } = req as Request & { file?: Express.Multer.File };
    const { fileType } = req.body as { fileType?: string };

    if (!file) {
      res.status(400).json({ code: "BAD_REQUEST", error: "Missing file" });
      return;
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".csv") {
      try {
        fs.unlinkSync(file.path);
      } catch {
        // ignore
      }
      res.status(415).json({
        code: "UNSUPPORTED_MEDIA_TYPE",
        error: "Only .csv files are allowed",
      });
      return;
    }

    if (!fileType) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        // ignore
      }
      res.status(400).json({ code: "BAD_REQUEST", error: "Missing fileType" });
      return;
    }

    const parsedType = fileTypeSchema.safeParse(fileType);
    if (!parsedType.success) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        // ignore
      }
      res.status(400).json({
        code: "BAD_REQUEST",
        error: "Invalid fileType",
        fields: {
          fileType: "Must be loan_tape | servicer_update | document_manifest",
        },
      });
      return;
    }

    const { user } = req;
    if (!user) {
      res.status(401).json({ code: "UNAUTHENTICATED", error: "Unauthorized" });
      return;
    }

    const batch = await prisma.uploadBatch.create({
      data: {
        fileName: file.originalname,
        filePath: file.path,
        fileType: parsedType.data,
        recordCount: 0,
        status: "processing",
        uploadedById: user.id,
      },
    });

    const response: CreateUploadResponse = {
      batchId: batch.id,
      fileName: batch.fileName,
      fileType: batch.fileType as CreateUploadResponse["fileType"],
      message: "File uploaded. Processing has started.",
      status: "processing",
    };

    res.status(202).json(response);

    processStreamAndNormalize(file.path, batch.id).catch(() => {
      // ingestion handles its own failure marking
    });
  }
);

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const parsed = listUploadsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      code: "BAD_REQUEST",
      error: "Invalid query",
      fields: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          issue.path.join("."),
          issue.message,
        ])
      ),
    });
    return;
  }

  const { page, limit, status } = parsed.data;
  const { user } = req;
  if (!user) {
    res.status(401).json({ code: "UNAUTHENTICATED", error: "Unauthorized" });
    return;
  }

  const where: Record<string, unknown> = { uploadedById: user.id };
  if (status) {
    const statusParsed = batchStatusSchema.safeParse(status);
    if (!statusParsed.success) {
      res.status(400).json({ code: "BAD_REQUEST", error: "Invalid status" });
      return;
    }
    where.status = status;
  }

  const skip = (page - 1) * limit;
  const [total, batches] = await Promise.all([
    prisma.uploadBatch.count({ where }),
    prisma.uploadBatch.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      where,
    }),
  ]);

  const data = batches.map((batch) => ({
    createdAt: batch.createdAt.toISOString(),
    failedCount: batch.failedCount,
    fileName: batch.fileName,
    fileType: batch.fileType,
    id: batch.id,
    recordCount: batch.recordCount,
    status: batch.status,
  }));

  res.json({
    data,
    pagination: {
      limit,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.get("/:batchId", async (req: Request, res: Response): Promise<void> => {
  const { batchId } = req.params as { batchId: string };

  const batch = await prisma.uploadBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    res.status(404).json({ code: "NOT_FOUND", error: "Batch not found" });
    return;
  }

  const metadata = (batch.metadata as Record<string, unknown> | null) ?? {};
  const failedRows = Array.isArray(metadata.failedRows)
    ? (metadata.failedRows as unknown[])
    : [];

  const response: GetBatchResponse = {
    createdAt: batch.createdAt.toISOString(),
    failedCount: batch.failedCount,
    failedRows: failedRows as GetBatchResponse["failedRows"],
    fileName: batch.fileName,
    fileType: batch.fileType as GetBatchResponse["fileType"],
    id: batch.id,
    metadata: batch.metadata,
    recordCount: batch.recordCount,
    status: batch.status as GetBatchResponse["status"],
    updatedAt: batch.updatedAt.toISOString(),
    uploadedById: batch.uploadedById,
  };

  res.json(response);
});

router.get(
  "/:batchId/summary",
  async (req: Request, res: Response): Promise<void> => {
    const { batchId } = req.params as { batchId: string };

    const batch = await prisma.uploadBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      res.status(404).json({ code: "NOT_FOUND", error: "Batch not found" });
      return;
    }

    const totalImported = await prisma.loan.count({
      where: { sourceBatchId: batchId },
    });

    const exceptions = await prisma.exception.findMany({
      where: { loan: { sourceBatchId: batchId } },
      select: { exceptionType: true, severity: true },
    });

    const exceptionsByType: Record<string, number> = {
      balance_error: 0,
      conflicting_source: 0,
      date_error: 0,
      duplicate: 0,
      invalid_state: 0,
      missing_field: 0,
      rate_out_of_range: 0,
      stale_record: 0,
      status_inconsistency: 0,
    };

    const exceptionsBySeverity: Record<string, number> = {
      critical: 0,
      high: 0,
      low: 0,
      medium: 0,
    };

    for (const exception of exceptions) {
      const { exceptionType, severity } = exception;
      if (exceptionType in exceptionsByType) {
        exceptionsByType[exceptionType] =
          (exceptionsByType[exceptionType] ?? 0) + 1;
      }
      if (severity in exceptionsBySeverity) {
        exceptionsBySeverity[severity] =
          (exceptionsBySeverity[severity] ?? 0) + 1;
      }
    }

    const failedValidation = exceptions.length;
    const passedValidation = Math.max(0, totalImported - failedValidation);

    const summary: BatchSummary = {
      batchId,
      exceptionsBySeverity:
        exceptionsBySeverity as BatchSummary["exceptionsBySeverity"],
      exceptionsByType: exceptionsByType as BatchSummary["exceptionsByType"],
      failedValidation,
      passedValidation,
      totalImported,
    };

    res.json(summary);
  }
);

export default router;
