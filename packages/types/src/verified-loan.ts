import { z } from "zod";
import { reviewerDecisionSchema, validationResultSchema } from "./common.js";

export const canonicalDataSchema = z.object({
  borrowerId: z.string().nullable(),
  borrowerState: z.string().nullable(),
  creditGrade: z.string().nullable(),
  currentBalance: z.string().nullable(),
  daysPastDue: z.number().int().nullable(),
  documentStatus: z.string().nullable(),
  employmentLength: z.string().nullable(),
  incomeBand: z.string().nullable(),
  interestRate: z.string().nullable(),
  lastPaymentDate: z.string().nullable(),
  loanId: z.string().nullable(),
  loanPurpose: z.string().nullable(),
  loanType: z.string().nullable(),
  maturityDate: z.string().nullable(),
  originalPrincipal: z.string().nullable(),
  originationDate: z.string().nullable(),
  paymentStatus: z.string().nullable(),
  servicerName: z.string().nullable(),
  sourceSystem: z.string().nullable(),
  termMonths: z.number().int().nullable(),
});
export type CanonicalData = z.infer<typeof canonicalDataSchema>;

export const verifiedLoanListItemSchema = z.object({
  aiRecommendationUsed: z.boolean(),
  id: z.string(),
  loan: z.object({
    borrowerId: z.string().nullable(),
    loanId: z.string().nullable(),
  }),
  loanId: z.string(),
  recordHash: z.string(),
  reviewerDecision: reviewerDecisionSchema.nullable().optional(),
  sourceBatchRef: z.string(),
  validationResult: validationResultSchema,
  verifiedAt: z.string(),
  verifiedById: z.string(),
});
export type VerifiedLoanListItem = z.infer<typeof verifiedLoanListItemSchema>;

export const verifiedLoanDetailSchema = z.object({
  aiRecommendationUsed: z.boolean(),
  canonicalData: canonicalDataSchema,
  id: z.string(),
  loanId: z.string(),
  recordHash: z.string(),
  reviewerDecision: reviewerDecisionSchema.nullable().optional(),
  sourceBatchRef: z.string(),
  validationResult: validationResultSchema,
  verifiedAt: z.string(),
  verifiedById: z.string(),
});
export type VerifiedLoanDetail = z.infer<typeof verifiedLoanDetailSchema>;

export const verifiedLoanListQuerySchema = z.object({
  aiRecommendationUsed: z.coerce.boolean().optional(),
  batchId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
  validationResult: validationResultSchema.optional(),
});
export type VerifiedLoanListQuery = z.infer<typeof verifiedLoanListQuerySchema>;

export const verifiedLoanListResponseSchema = z.object({
  data: z.array(verifiedLoanListItemSchema),
  pagination: z.object({
    limit: z.number().int().min(1),
    page: z.number().int().min(1),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
  qualityScore: z.number().min(0).max(100),
});
export type VerifiedLoanListResponse = z.infer<
  typeof verifiedLoanListResponseSchema
>;
