import { describe, expect, it } from "bun:test";
import {
  batchSummarySchema,
  exceptionDecisionBodySchema,
  loanListQuerySchema,
  uploadBatchSchema,
  verifiedLoanListItemSchema,
} from "./index.js";

describe("batchSummarySchema", () => {
  it("accepts valid summary with all 9 exception types", () => {
    const valid = {
      batchId: "clx_batch_001",
      exceptionsBySeverity: {
        critical: 75,
        high: 91,
        low: 20,
        medium: 60,
      },
      exceptionsByType: {
        balance_error: 41,
        conflicting_source: 0,
        date_error: 22,
        duplicate: 34,
        invalid_state: 12,
        missing_field: 89,
        rate_out_of_range: 18,
        stale_record: 15,
        status_inconsistency: 27,
      },
      failedValidation: 246,
      passedValidation: 742,
      totalImported: 988,
    };
    expect(batchSummarySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects unknown exception type", () => {
    const invalid = {
      batchId: "clx_batch_001",
      exceptionsBySeverity: { critical: 1, high: 0, low: 0, medium: 0 },
      exceptionsByType: { unknown_type: 1 } as never,
      failedValidation: 1,
      passedValidation: 0,
      totalImported: 0,
    };
    expect(batchSummarySchema.safeParse(invalid).success).toBe(false);
  });
});

describe("loanListQuerySchema", () => {
  it("coerces page string to number and defaults limit", () => {
    const parsed = loanListQuerySchema.parse({ page: "2" });
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(20);
  });

  it("rejects page 0", () => {
    expect(() => loanListQuerySchema.parse({ page: 0 })).toThrow();
  });
});

describe("exceptionDecisionBodySchema", () => {
  it("requires editedValue when decision is edited", () => {
    expect(
      exceptionDecisionBodySchema.safeParse({
        decision: "edited",
        editedValue: null,
      }).success
    ).toBe(false);
    expect(
      exceptionDecisionBodySchema.safeParse({
        decision: "edited",
        editedValue: "340000",
      }).success
    ).toBe(true);
  });

  it("allows accepted without editedValue", () => {
    expect(
      exceptionDecisionBodySchema.safeParse({ decision: "accepted" }).success
    ).toBe(true);
  });
});

describe("verifiedLoanListItemSchema", () => {
  it("rejects invalid reviewerDecision", () => {
    const base = {
      aiRecommendationUsed: false,
      id: "vl_1",
      loan: { borrowerId: "B-1", loanId: "L-1" },
      loanId: "loan_1",
      recordHash: "abc",
      sourceBatchRef: "loan_tape.csv (batch_1)",
      validationResult: "passed" as const,
      verifiedAt: "2026-08-25T12:00:00.000Z",
      verifiedById: "user_1",
    };
    expect(
      verifiedLoanListItemSchema.safeParse({
        ...base,
        reviewerDecision: "rejected_for_fun",
      } as never).success
    ).toBe(false);
    expect(
      verifiedLoanListItemSchema.safeParse({
        ...base,
        reviewerDecision: "approved",
      }).success
    ).toBe(true);
  });
});

describe("uploadBatchSchema", () => {
  it("rejects invalid fileType", () => {
    expect(
      uploadBatchSchema.safeParse({
        createdAt: "2026-08-25T10:00:00.000Z",
        failedCount: 0,
        fileName: "test.csv",
        fileType: "invalid",
        id: "batch_1",
        recordCount: 10,
        status: "pending",
      } as never).success
    ).toBe(false);
  });
});
