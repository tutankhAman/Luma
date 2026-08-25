import { z } from "zod";
import { auditEventTypeSchema, roleSchema } from "./common.js";

export const auditActorSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: roleSchema,
});
export type AuditActor = z.infer<typeof auditActorSchema>;

export const auditLogEntrySchema = z.object({
  actor: auditActorSchema.nullable(),
  createdAt: z.string(),
  eventType: auditEventTypeSchema,
  id: z.string(),
  metadata: z.unknown().nullable().optional(),
});
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

export const auditTrailResponseSchema = z.object({
  data: z.array(auditLogEntrySchema),
  loanId: z.string(),
  pagination: z.object({
    limit: z.number().int().min(1),
    page: z.number().int().min(1),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});
export type AuditTrailResponse = z.infer<typeof auditTrailResponseSchema>;

export const auditListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).default(1),
});
export type AuditListQuery = z.infer<typeof auditListQuerySchema>;

export const summaryOverviewSchema = z.object({
  openExceptions: z.number().int().nonnegative(),
  qualityScore: z.number().min(0).max(100),
  totalBatches: z.number().int().nonnegative(),
  totalExceptions: z.number().int().nonnegative(),
  totalLoansImported: z.number().int().nonnegative(),
  verifiedLoans: z.number().int().nonnegative(),
});
export type SummaryOverview = z.infer<typeof summaryOverviewSchema>;

export const summaryResponseSchema = z.object({
  exceptionsBySeverity: z.record(z.string(), z.number().int().nonnegative()),
  exceptionsByType: z.record(z.string(), z.number().int().nonnegative()),
  overview: summaryOverviewSchema,
  recentActivity: z.array(
    z.object({
      actor: z.string().nullable(),
      eventType: auditEventTypeSchema,
      loanId: z.string().nullable().optional(),
      timestamp: z.string(),
    })
  ),
});
export type SummaryResponse = z.infer<typeof summaryResponseSchema>;
