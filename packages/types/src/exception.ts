import { z } from "zod";
import {
  aiDecisionSchema,
  exceptionStatusSchema,
  exceptionTypeSchema,
  severitySchema,
} from "./common.js";

export const aiRecommendationFieldChangeSchema = z.object({
  currentValue: z.string().nullable().optional(),
  field: z.string(),
  source: z.string().optional(),
  suggestedValue: z.string(),
});
export type AiRecommendationFieldChange = z.infer<
  typeof aiRecommendationFieldChangeSchema
>;

export const aiRecommendationSchema = z.object({
  confidence: z.number().min(0).max(1),
  fieldsToChange: z.array(aiRecommendationFieldChangeSchema),
  model: z.string(),
  promptSummary: z.string(),
  reasoning: z.string(),
  suggestion: z.string(),
  timestamp: z.string(),
});
export type AiRecommendation = z.infer<typeof aiRecommendationSchema>;

export const exceptionLoanSchema = z.object({
  borrowerId: z.string().nullable(),
  id: z.string(),
  loanId: z.string().nullable(),
  validationStatus: z.string().optional(),
});
export type ExceptionLoan = z.infer<typeof exceptionLoanSchema>;

export const exceptionListItemSchema = z.object({
  aiRecommendation: aiRecommendationSchema.nullable().optional(),
  createdAt: z.string(),
  exceptionType: exceptionTypeSchema,
  field: z.string().nullable(),
  id: z.string(),
  loan: exceptionLoanSchema,
  message: z.string(),
  severity: severitySchema,
  status: exceptionStatusSchema,
});
export type ExceptionListItem = z.infer<typeof exceptionListItemSchema>;

export const exceptionDetailSchema = z.object({
  aiRecommendation: aiRecommendationSchema.nullable(),
  correctedValue: z.string().nullable(),
  createdAt: z.string(),
  exceptionType: exceptionTypeSchema,
  field: z.string().nullable(),
  id: z.string(),
  loan: z.object({
    id: z.string(),
    loanId: z.string().nullable(),
  }),
  message: z.string(),
  reviewedAt: z.string().nullable(),
  reviewerId: z.string().nullable(),
  reviewerNote: z.string().nullable(),
  severity: severitySchema,
  status: exceptionStatusSchema,
  updatedAt: z.string(),
});
export type ExceptionDetail = z.infer<typeof exceptionDetailSchema>;

export const exceptionCommentBodySchema = z.object({
  note: z.string().min(1).max(2000),
});
export type ExceptionCommentBody = z.infer<typeof exceptionCommentBodySchema>;

export const exceptionApproveBodySchema = z.object({
  correctedValue: z.string().optional(),
  note: z.string().min(1).max(2000).optional(),
});
export type ExceptionApproveBody = z.infer<typeof exceptionApproveBodySchema>;

export const exceptionRejectBodySchema = z.object({
  note: z.string().min(1).max(2000),
});
export type ExceptionRejectBody = z.infer<typeof exceptionRejectBodySchema>;

export const exceptionDecisionBodySchema = z
  .object({
    decision: aiDecisionSchema,
    editedValue: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decision === "edited" && !data.editedValue) {
      ctx.addIssue({
        code: "custom",
        message: "editedValue is required when decision is edited",
        path: ["editedValue"],
      });
    }
  });
export type ExceptionDecisionBody = z.infer<typeof exceptionDecisionBodySchema>;

export const exceptionDecisionResponseSchema = z.object({
  aiDecision: aiDecisionSchema,
  exceptionId: z.string(),
  recordedAt: z.string(),
});
export type ExceptionDecisionResponse = z.infer<
  typeof exceptionDecisionResponseSchema
>;

export const exceptionListQuerySchema = z.object({
  batchId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
  severity: severitySchema.optional(),
  status: exceptionStatusSchema.optional(),
  type: exceptionTypeSchema.optional(),
});
export type ExceptionListQuery = z.infer<typeof exceptionListQuerySchema>;

export const aiExplainRequestSchema = z.object({
  exceptionId: z.string().min(1),
});
export type AiExplainRequest = z.infer<typeof aiExplainRequestSchema>;

export const aiExplainResponseSchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
  exceptionId: z.string(),
  recommendation: aiRecommendationSchema.nullable(),
});
export type AiExplainResponse = z.infer<typeof aiExplainResponseSchema>;

export const aiSummarizeBatchRequestSchema = z.object({
  batchId: z.string().min(1),
});
export type AiSummarizeBatchRequest = z.infer<
  typeof aiSummarizeBatchRequestSchema
>;

export const aiSummarizeBatchResponseSchema = z.object({
  batchId: z.string(),
  code: z.string().optional(),
  error: z.string().optional(),
  model: z.string(),
  summary: z.string().nullable(),
  timestamp: z.string(),
});
export type AiSummarizeBatchResponse = z.infer<
  typeof aiSummarizeBatchResponseSchema
>;

export const aiClassifySeverityRequestSchema = z.object({
  exceptionId: z.string().min(1),
});
export type AiClassifySeverityRequest = z.infer<
  typeof aiClassifySeverityRequestSchema
>;

export const aiClassifySeverityResponseSchema = z.object({
  code: z.string().optional(),
  currentSeverity: severitySchema,
  error: z.string().optional(),
  exceptionId: z.string(),
  model: z.string(),
  reasoning: z.string().nullable(),
  suggestedSeverity: severitySchema.nullable(),
  timestamp: z.string(),
});
export type AiClassifySeverityResponse = z.infer<
  typeof aiClassifySeverityResponseSchema
>;

export const aiSuggestRuleRequestSchema = z.object({
  prompt: z.string().min(1).max(500),
});
export type AiSuggestRuleRequest = z.infer<typeof aiSuggestRuleRequestSchema>;

export const aiSuggestRuleResponseSchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
  model: z.string(),
  note: z.string().optional(),
  promptSummary: z.string(),
  rule: z
    .object({
      condition: z.unknown(),
      description: z.string(),
      exceptionType: exceptionTypeSchema,
      id: z.string(),
      name: z.string(),
      severity: severitySchema,
    })
    .nullable(),
  timestamp: z.string(),
});
export type AiSuggestRuleResponse = z.infer<typeof aiSuggestRuleResponseSchema>;
