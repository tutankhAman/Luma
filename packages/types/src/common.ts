import { z } from "zod";

export const roleSchema = z.enum([
  "data_operator",
  "reviewer",
  "data_consumer",
]);
export type Role = z.infer<typeof roleSchema>;

export const batchStatusSchema = z.enum([
  "pending",
  "processing",
  "done",
  "failed",
]);
export type BatchStatus = z.infer<typeof batchStatusSchema>;

export const fileTypeSchema = z.enum([
  "loan_tape",
  "servicer_update",
  "document_manifest",
]);
export type FileType = z.infer<typeof fileTypeSchema>;

export const validationStatusSchema = z.enum([
  "pending",
  "passed",
  "failed",
  "review",
]);
export type ValidationStatus = z.infer<typeof validationStatusSchema>;

export const importStatusSchema = z.enum(["imported", "failed"]);
export type ImportStatus = z.infer<typeof importStatusSchema>;

export const exceptionTypeSchema = z.enum([
  "missing_field",
  "duplicate",
  "date_error",
  "balance_error",
  "rate_out_of_range",
  "status_inconsistency",
  "stale_record",
  "conflicting_source",
  "invalid_state",
]);
export type ExceptionType = z.infer<typeof exceptionTypeSchema>;

export const severitySchema = z.enum(["critical", "high", "medium", "low"]);
export type Severity = z.infer<typeof severitySchema>;

export const exceptionStatusSchema = z.enum([
  "open",
  "approved",
  "rejected",
  "corrected",
]);
export type ExceptionStatus = z.infer<typeof exceptionStatusSchema>;

export const auditEventTypeSchema = z.enum([
  "FILE_UPLOADED",
  "LOAN_IMPORTED",
  "VALIDATION_RUN",
  "EXCEPTION_CREATED",
  "AI_RECOMMENDATION",
  "REVIEWER_COMMENT",
  "FIELD_EDITED",
  "LOAN_APPROVED",
  "LOAN_REJECTED",
  "VERIFIED_RECORD_CREATED",
  "RECORD_EXPORTED",
]);
export type AuditEventType = z.infer<typeof auditEventTypeSchema>;

export const validationResultSchema = z.enum(["passed", "passed_with_review"]);
export type ValidationResult = z.infer<typeof validationResultSchema>;

export const reviewerDecisionSchema = z.enum([
  "approved",
  "approved_with_edits",
]);
export type ReviewerDecision = z.infer<typeof reviewerDecisionSchema>;

export const aiDecisionSchema = z.enum(["accepted", "edited", "rejected"]);
export type AiDecision = z.infer<typeof aiDecisionSchema>;
