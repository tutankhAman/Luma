import { z } from "zod";
import {
  exceptionStatusSchema,
  exceptionTypeSchema,
  importStatusSchema,
  severitySchema,
  validationResultSchema,
  validationStatusSchema,
} from "./common.js";

export const loanEditableFieldSchema = z.enum([
  "currentBalance",
  "interestRate",
  "paymentStatus",
  "documentStatus",
  "borrowerState",
  "servicerName",
  "creditGrade",
]);
export type LoanEditableField = z.infer<typeof loanEditableFieldSchema>;

export const loanSourceBatchSchema = z.object({
  fileName: z.string(),
  id: z.string(),
});
export type LoanSourceBatch = z.infer<typeof loanSourceBatchSchema>;

export const loanListItemSchema = z.object({
  borrowerId: z.string().nullable(),
  borrowerState: z.string().nullable(),
  currentBalance: z.string().nullable(),
  exceptionCount: z.number().int().nonnegative(),
  id: z.string(),
  interestRate: z.string().nullable(),
  loanId: z.string().nullable(),
  loanType: z.string().nullable(),
  originalPrincipal: z.string().nullable(),
  paymentStatus: z.string().nullable(),
  sourceBatch: loanSourceBatchSchema,
  sourceRowNumber: z.number().int().positive(),
  validationStatus: validationStatusSchema,
});
export type LoanListItem = z.infer<typeof loanListItemSchema>;

export const loanExceptionItemSchema = z.object({
  aiRecommendation: z.unknown().nullable(),
  createdAt: z.string(),
  exceptionType: exceptionTypeSchema,
  field: z.string().nullable(),
  id: z.string(),
  message: z.string(),
  metadata: z.unknown().nullable(),
  severity: severitySchema,
  status: exceptionStatusSchema,
});
export type LoanExceptionItem = z.infer<typeof loanExceptionItemSchema>;

export const loanDetailSchema = z.object({
  borrowerId: z.string().nullable(),
  borrowerState: z.string().nullable(),
  creditGrade: z.string().nullable(),
  currentBalance: z.string().nullable(),
  daysPastDue: z.number().int().nullable(),
  documentStatus: z.string().nullable(),
  employmentLength: z.string().nullable(),
  exceptions: z.array(loanExceptionItemSchema),
  id: z.string(),
  importStatus: importStatusSchema,
  incomeBand: z.string().nullable(),
  interestRate: z.string().nullable(),
  lastPaymentDate: z.string().nullable(),
  lastUpdatedAt: z.string().nullable(),
  loanId: z.string().nullable(),
  loanPurpose: z.string().nullable(),
  loanType: z.string().nullable(),
  maturityDate: z.string().nullable(),
  originalPrincipal: z.string().nullable(),
  originationDate: z.string().nullable(),
  paymentStatus: z.string().nullable(),
  servicerName: z.string().nullable(),
  sourceBatch: loanSourceBatchSchema,
  sourceRowNumber: z.number().int().positive(),
  sourceSystem: z.string().nullable(),
  termMonths: z.number().int().nullable(),
  validationStatus: validationStatusSchema,
  verifiedRecord: z
    .object({
      id: z.string(),
      recordHash: z.string(),
      validationResult: validationResultSchema,
      verifiedAt: z.string(),
      verifiedById: z.string(),
    })
    .passthrough()
    .nullable(),
});
export type LoanDetail = z.infer<typeof loanDetailSchema>;

export const loanFieldsPatchBodySchema = z.object({
  fields: z
    .partialRecord(loanEditableFieldSchema.or(z.never()), z.string())
    .refine((fields) => Object.keys(fields).length > 0, {
      message: "At least one field must be provided",
    }),
  reason: z.string().min(1, "Reason is required").max(500),
});
export type LoanFieldsPatchBody = z.infer<typeof loanFieldsPatchBodySchema>;

export const loanFieldsPatchResponseSchema = z.object({
  id: z.string(),
  updatedAt: z.string(),
  updatedFields: z.array(loanEditableFieldSchema),
});
export type LoanFieldsPatchResponse = z.infer<
  typeof loanFieldsPatchResponseSchema
>;

export const loanVerifyResponseSchema = z.object({
  verifiedLoan: z.object({
    id: z.string(),
    loanId: z.string(),
    recordHash: z.string(),
    validationResult: validationResultSchema,
    verifiedAt: z.string(),
    verifiedById: z.string(),
  }),
});
export type LoanVerifyResponse = z.infer<typeof loanVerifyResponseSchema>;

export const loanListQuerySchema = z.object({
  batchId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
  validationStatus: validationStatusSchema.optional(),
});
export type LoanListQuery = z.infer<typeof loanListQuerySchema>;
