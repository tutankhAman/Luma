import { z } from "zod";
import {
  batchStatusSchema,
  exceptionTypeSchema,
  fileTypeSchema,
  severitySchema,
} from "./common.js";

export const failedRowSchema = z.object({
  rawData: z.string(),
  reason: z.string(),
  rowNumber: z.number().int().positive(),
});
export type FailedRow = z.infer<typeof failedRowSchema>;

export const uploadBatchSchema = z.object({
  createdAt: z.string(),
  failedCount: z.number().int().nonnegative(),
  failedRows: z.array(failedRowSchema).optional(),
  fileName: z.string(),
  fileType: fileTypeSchema,
  id: z.string(),
  metadata: z.unknown().nullable().optional(),
  processedCount: z.number().int().nonnegative().optional(),
  recordCount: z.number().int().nonnegative(),
  status: batchStatusSchema,
  updatedAt: z.string().optional(),
  uploadedById: z.string().optional(),
});
export type UploadBatch = z.infer<typeof uploadBatchSchema>;

export const createUploadResponseSchema = z.object({
  batchId: z.string(),
  fileName: z.string(),
  fileType: fileTypeSchema,
  message: z.string(),
  status: batchStatusSchema,
});
export type CreateUploadResponse = z.infer<typeof createUploadResponseSchema>;

export const createUploadBodySchema = z.object({
  fileType: fileTypeSchema,
});
export type CreateUploadBody = z.infer<typeof createUploadBodySchema>;

export const listUploadsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  status: batchStatusSchema.optional(),
});
export type ListUploadsQuery = z.infer<typeof listUploadsQuerySchema>;

export const getBatchResponseSchema = uploadBatchSchema;
export type GetBatchResponse = z.infer<typeof getBatchResponseSchema>;

export const batchSummarySchema = z.object({
  batchId: z.string(),
  exceptionsBySeverity: z.record(
    severitySchema,
    z.number().int().nonnegative()
  ),
  exceptionsByType: z.record(
    exceptionTypeSchema,
    z.number().int().nonnegative()
  ),
  failedValidation: z.number().int().nonnegative(),
  passedValidation: z.number().int().nonnegative(),
  totalImported: z.number().int().nonnegative(),
});
export type BatchSummary = z.infer<typeof batchSummarySchema>;
