import { describe, expect, it, mock } from "bun:test";

const fakePrisma: Record<string, unknown> = {
  $transaction: mock(async (cb: (tx: unknown) => Promise<unknown>) =>
    cb({
      auditLog: { create: mock(() => Promise.resolve({})) },
      exception: { createMany: mock(() => Promise.resolve({})) },
      loan: {
        findMany: mock(() => Promise.resolve([])),
        update: mock(() => Promise.resolve({})),
      },
    } as never)
  ),
  loan: { findMany: mock(() => Promise.resolve([])) },
};

mock.module("../lib/prisma.js", () => ({ prisma: fakePrisma as never }));
mock.module("../lib/validation-thresholds.js", () => ({
  defaultThresholds: {
    duplicateBorrowerThreshold: 5,
    interestRateMax: 40,
    interestRateMin: 0,
    staleDaysThreshold: 90,
  },
  loadThresholds: () => ({
    duplicateBorrowerThreshold: 5,
    interestRateMax: 40,
    interestRateMin: 0,
    staleDaysThreshold: 90,
  }),
}));

const { runPerLoanRules } = await import("./validation.service.js");

describe("runPerLoanRules", () => {
  const baseLoan = {
    borrowerId: "B-5001",
    borrowerState: "CA",
    currentBalance: 342_000,
    daysPastDue: 0,
    documentStatus: "complete",
    id: "loan_1",
    interestRate: 6.75,
    lastUpdatedAt: new Date(),
    loanId: "L-10001",
    maturityDate: new Date("2052-03-15"),
    originalPrincipal: 350_000,
    originationDate: new Date("2022-03-15"),
    paymentStatus: "current",
    sourceBatchId: "batch_1",
  };

  it("passes clean loan", () => {
    const result = runPerLoanRules(baseLoan);
    expect(result.length).toBe(0);
  });

  it("missing loanId -> missing_field critical", () => {
    const result = runPerLoanRules({ ...baseLoan, loanId: null });
    expect(
      result.some(
        (r) => r.exceptionType === "missing_field" && r.field === "loanId"
      )
    ).toBe(true);
    expect(result.find((r) => r.field === "loanId")?.severity).toBe("critical");
  });

  it("maturity before origination -> date_error high", () => {
    const result = runPerLoanRules({
      ...baseLoan,
      maturityDate: new Date("2020-01-01"),
      originationDate: new Date("2022-03-15"),
    });
    expect(result.some((r) => r.exceptionType === "date_error")).toBe(true);
  });

  it("negative principal -> balance_error critical", () => {
    const result = runPerLoanRules({ ...baseLoan, originalPrincipal: -100 });
    expect(
      result.some(
        (r) =>
          r.exceptionType === "balance_error" && r.field === "originalPrincipal"
      )
    ).toBe(true);
  });

  it("balance exceeds principal -> balance_error", () => {
    const result = runPerLoanRules({
      ...baseLoan,
      currentBalance: 400_000,
      originalPrincipal: 350_000,
    });
    expect(result.some((r) => r.field === "currentBalance")).toBe(true);
  });

  it("interest rate out of range -> rate_out_of_range", () => {
    const result = runPerLoanRules({ ...baseLoan, interestRate: 50 });
    expect(result.some((r) => r.exceptionType === "rate_out_of_range")).toBe(
      true
    );
  });

  it("current but daysPastDue >0 -> status_inconsistency", () => {
    const result = runPerLoanRules({
      ...baseLoan,
      daysPastDue: 5,
      paymentStatus: "current",
    });
    expect(result.some((r) => r.exceptionType === "status_inconsistency")).toBe(
      true
    );
  });

  it("closed with balance -> status_inconsistency", () => {
    const result = runPerLoanRules({
      ...baseLoan,
      currentBalance: 100,
      paymentStatus: "closed",
    });
    expect(result.some((r) => r.message.includes("closed"))).toBe(true);
  });

  it("missing documentStatus -> missing_field", () => {
    const result = runPerLoanRules({ ...baseLoan, documentStatus: null });
    expect(result.some((r) => r.field === "documentStatus")).toBe(true);
  });

  it("stale record -> stale_record low", () => {
    const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    const result = runPerLoanRules({ ...baseLoan, lastUpdatedAt: old });
    expect(result.some((r) => r.exceptionType === "stale_record")).toBe(true);
    expect(
      result.find((r) => r.exceptionType === "stale_record")?.severity
    ).toBe("low");
  });

  it("invalid state -> invalid_state", () => {
    const result = runPerLoanRules({ ...baseLoan, borrowerState: "XX" });
    expect(result.some((r) => r.exceptionType === "invalid_state")).toBe(true);
  });

  it("valid state passes", () => {
    const result = runPerLoanRules({ ...baseLoan, borrowerState: "NY" });
    expect(result.some((r) => r.exceptionType === "invalid_state")).toBe(false);
  });

  it("duplicate thresholds create extra exception via runBatch (covered in integration)", () => {
    // per-loan alone cannot detect duplicates; verified in integration batch test
    expect(
      runPerLoanRules(baseLoan).filter((r) => r.exceptionType === "duplicate")
        .length
    ).toBe(0);
  });
});

describe("runBatch basic", () => {
  it("empty batch returns zeros", async () => {
    const { runBatch } = await import("./validation.service.js");
    // Mock findMany to return empty
    const prisma = (await import("../lib/prisma.js")).prisma as unknown as {
      loan: { findMany: ReturnType<typeof mock> };
    };
    prisma.loan.findMany = mock(() => Promise.resolve([] as never));
    const result = await runBatch("batch_empty");
    expect(result.loanCount).toBe(0);
    expect(result.exceptionCount).toBe(0);
  });
});
