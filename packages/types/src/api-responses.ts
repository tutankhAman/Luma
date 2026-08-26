import { z } from "zod";
import { roleSchema } from "./common.js";

export const paginationMetaSchema = z.object({
  limit: z.number().int().min(1),
  page: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T
) =>
  z.object({
    data: z.array(itemSchema),
    pagination: paginationMetaSchema,
  });

export const errorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "VALIDATION_ERROR",
  "INTERNAL_ERROR",
  "AI_UNAVAILABLE",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorResponseSchema = z.object({
  code: z.string(),
  error: z.string(),
  fields: z.record(z.string(), z.string()).optional(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const authOkResponseSchema = z.object({
  ok: z.literal(true),
});
export type AuthOkResponse = z.infer<typeof authOkResponseSchema>;

export const meResponseSchema = z.object({
  email: z.email(),
  id: z.string(),
  name: z.string(),
  role: roleSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;
