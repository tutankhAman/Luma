import { beforeEach, describe, expect, it, mock } from "bun:test";

/**
 * Unit tests for ai.service.ts — mocked prisma + mocked ai SDK.
 * Keep the same mock instance across tests; swap via mockImplementation().
 */

const generateObjectMock = mock(() =>
  Promise.resolve({
    object: {
      confidence: 0.9,
      fieldsToChange: [
        {
          currentValue: "342000",
          field: "currentBalance",
          source: "servicer_update",
          suggestedValue: "340000",
        },
      ],
      reasoning: "Servicer shows lower balance.",
      suggestion: "Set currentBalance to 340000",
    },
  } as never)
);
const generateTextMock = mock(() =>
  Promise.resolve({ text: "Batch summary text." } as never)
);

mock.module("ai", () => ({
  generateObject: generateObjectMock,
  generateText: generateTextMock,
}));

// ── Prisma fake ──
type FakePrisma = {
  $transaction: ReturnType<typeof mock>;
  auditLog: {
    create: ReturnType<typeof mock>;
    createMany: ReturnType<typeof mock>;
  };
  exception: {
    findUnique: ReturnType<typeof mock>;
    groupBy: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    findMany: ReturnType<typeof mock>;
    createMany: ReturnType<typeof mock>;
  };
  loan: {
    count: ReturnType<typeof mock>;
    groupBy: ReturnType<typeof mock>;
    findMany: ReturnType<typeof mock>;
  };
  uploadBatch: {
    findUnique: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
  };
};

const fakePrisma: FakePrisma = {
  $transaction: null as unknown as ReturnType<typeof mock>,
  auditLog: {
    create: mock(() => Promise.resolve({} as never)),
    createMany: mock(() => Promise.resolve({} as never)),
  },
  exception: {
    createMany: mock(() => Promise.resolve({} as never)),
    findMany: mock(() => Promise.resolve([] as never)),
    findUnique: mock(() => Promise.resolve(null as never)),
    groupBy: mock(() => Promise.resolve([] as never)),
    update: mock(() => Promise.resolve({} as never)),
  } as unknown as FakePrisma["exception"] & {
    groupBy: ReturnType<typeof mock>;
  },
  loan: {
    count: mock(() => Promise.resolve(0 as never)),
    findMany: mock(() => Promise.resolve([] as never)),
    groupBy: mock(() => Promise.resolve([] as never)),
  },
  uploadBatch: {
    findUnique: mock(() => Promise.resolve(null as never)),
    update: mock(() => Promise.resolve({} as never)),
  },
};

(
  fakePrisma as unknown as { $transaction: ReturnType<typeof mock> }
).$transaction = mock((cb: (tx: unknown) => Promise<unknown>) =>
  cb({
    auditLog: fakePrisma.auditLog,
    exception: fakePrisma.exception,
    loan: fakePrisma.loan,
    uploadBatch: fakePrisma.uploadBatch,
  } as never)
) as never;

mock.module("../lib/prisma.js", () => ({
  prisma: fakePrisma as unknown as never,
}));

const { explainException, summarizeBatch, classifySeverity, suggestRule } =
  await import("./ai.service.js");
const { AiUnavailableError, NotFoundError, __resetAiModelCache } = await import(
  "../lib/ai.js"
);

const setEnv = (overrides: Record<string, string | undefined>) => {
  for (const key of ["GEMINI_API_KEY", "MOCK_AI", "AI_MODEL_ID"] as const) {
    if (key in overrides) {
      const v = overrides[key];
      if (v === undefined) {
        delete (process.env as Record<string, string | undefined>)[key];
      } else {
        process.env[key] = v;
      }
    }
  }
};

const loanFixture = (overrides: Record<string, unknown> = {}) => ({
  borrowerId: "B-5001",
  borrowerState: "CA",
  creditGrade: "A",
  currentBalance: "342000.00" as unknown,
  daysPastDue: 0,
  documentStatus: "complete",
  id: "loan_1",
  interestRate: "6.75" as unknown,
  loanId: "L-10001",
  originalPrincipal: "350000.00" as unknown,
  paymentStatus: "current",
  servicerName: "First National",
  ...overrides,
});

const exceptionFixture = (overrides: Record<string, unknown> = {}) => ({
  exceptionType: "balance_error",
  field: "currentBalance",
  id: "exc_1",
  loan: loanFixture(),
  loanId: "loan_1",
  message: "Current balance exceeds original principal",
  metadata: null,
  severity: "high",
  ...overrides,
});

const defaultGenerateObjectMockImpl = () =>
  Promise.resolve({
    object: {
      confidence: 0.9,
      fieldsToChange: [
        {
          currentValue: "342000",
          field: "currentBalance",
          source: "servicer_update",
          suggestedValue: "340000",
        },
      ],
      reasoning: "Servicer shows lower balance.",
      suggestion: "Set currentBalance to 340000",
    },
  } as never);

describe("ai.service", () => {
  beforeEach(() => {
    for (const k of ["GEMINI_API_KEY", "MOCK_AI", "AI_MODEL_ID"] as const) {
      delete (process.env as Record<string, string | undefined>)[k];
    }
    fakePrisma.exception.findUnique = mock(() =>
      Promise.resolve(null as never)
    );
    fakePrisma.exception.update = mock(() => Promise.resolve({} as never));
    fakePrisma.exception.findMany = mock(() => Promise.resolve([] as never));
    fakePrisma.exception.createMany = mock(() => Promise.resolve({} as never));
    fakePrisma.exception.groupBy = mock(() => Promise.resolve([] as never));
    fakePrisma.auditLog.create = mock(() => Promise.resolve({} as never));
    fakePrisma.auditLog.createMany = mock(() => Promise.resolve({} as never));
    fakePrisma.uploadBatch.findUnique = mock(() =>
      Promise.resolve(null as never)
    );
    fakePrisma.uploadBatch.update = mock(() => Promise.resolve({} as never));
    fakePrisma.loan.count = mock(() => Promise.resolve(0 as never));
    fakePrisma.loan.groupBy = mock(() => Promise.resolve([] as never));
    fakePrisma.loan.findMany = mock(() => Promise.resolve([] as never));
    (
      generateObjectMock as unknown as {
        mockImplementation: (fn: unknown) => void;
      }
    ).mockImplementation(defaultGenerateObjectMockImpl);
    (
      generateTextMock as unknown as {
        mockImplementation: (fn: unknown) => void;
      }
    ).mockImplementation(() =>
      Promise.resolve({ text: "Batch summary text." } as never)
    );
    process.env.MOCK_AI = "false";
    process.env.GEMINI_API_KEY = "test-key-for-unit";
    __resetAiModelCache();
  });

  it("explainException happy path saves recommendation + audit in transaction", async () => {
    fakePrisma.exception.findUnique = mock(() =>
      Promise.resolve(exceptionFixture() as never)
    );
    const res = await explainException("exc_1", "reviewer_1");
    expect(res.exceptionId).toBe("exc_1");
    expect(res.recommendation.suggestion).toContain("340000");
    expect(res.recommendation.confidence).toBe(0.9);
    expect(res.recommendation.model).toBe("gemini-2.0-flash");
    expect(res.recommendation.promptSummary).toContain("balance_error");
    expect(res.recommendation.timestamp).toBeDefined();
    expect(generateObjectMock).toHaveBeenCalled();
    const txCalls = (
      fakePrisma as unknown as { $transaction: ReturnType<typeof mock> }
    ).$transaction.mock.calls;
    expect(txCalls.length).toBe(1);
  });

  it("explainException throws NotFoundError when missing", async () => {
    fakePrisma.exception.findUnique = mock(() =>
      Promise.resolve(null as never)
    );
    await expect(explainException("nope")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("explainException throws AiUnavailableError when no key and not mock", async () => {
    setEnv({ GEMINI_API_KEY: undefined, MOCK_AI: "false" });
    fakePrisma.exception.findUnique = mock(() =>
      Promise.resolve(exceptionFixture() as never)
    );
    await expect(explainException("exc_1")).rejects.toBeInstanceOf(
      AiUnavailableError
    );
  });

  it("explainException wraps generateObject failure as AiUnavailableError", async () => {
    fakePrisma.exception.findUnique = mock(() =>
      Promise.resolve(exceptionFixture() as never)
    );
    (
      generateObjectMock as unknown as {
        mockImplementation: (fn: unknown) => void;
      }
    ).mockImplementation(() => Promise.reject(new Error("quota exceeded")));
    await expect(explainException("exc_1")).rejects.toBeInstanceOf(
      AiUnavailableError
    );
  });

  it("explainException uses MOCK_AI deterministic payload without calling SDK", async () => {
    setEnv({ MOCK_AI: "true" });
    fakePrisma.exception.findUnique = mock(() =>
      Promise.resolve(exceptionFixture() as never)
    );
    let called = false;
    (
      generateObjectMock as unknown as {
        mockImplementation: (fn: unknown) => void;
      }
    ).mockImplementation(() => {
      called = true;
      return Promise.reject(new Error("should not be called"));
    });
    const res = await explainException("exc_1", "reviewer_1");
    expect(res.recommendation.model).toContain("mock");
    expect(res.recommendation.reasoning).toContain("Mock AI");
    expect(called).toBe(false);
  });

  it("explainException includes conflict metadata in prompt", async () => {
    const exc = exceptionFixture({
      exceptionType: "conflicting_source",
      field: "currentBalance",
      metadata: {
        conflictBatchId: "batch_servicer",
        field: "currentBalance",
        sourceValue: "340000",
        targetValue: "342000",
      },
    });
    fakePrisma.exception.findUnique = mock(() => Promise.resolve(exc as never));
    let capturedPrompt = "";
    (
      generateObjectMock as unknown as {
        mockImplementation: (fn: unknown) => void;
      }
    ).mockImplementation((args: { prompt: string }) => {
      capturedPrompt = args.prompt;
      return Promise.resolve({
        object: {
          confidence: 0.8,
          fieldsToChange: [
            { field: "currentBalance", suggestedValue: "340000" },
          ],
          reasoning: "r",
          suggestion: "s",
        },
      } as never);
    });
    await explainException("exc_1");
    expect(capturedPrompt).toContain("conflicting_source");
    expect(capturedPrompt).toContain("340000");
  });

  it("classifySeverity returns current+suggested without mutating severity (G4)", async () => {
    fakePrisma.exception.findUnique = mock(() =>
      Promise.resolve(exceptionFixture({ severity: "high" }) as never)
    );
    (
      generateObjectMock as unknown as {
        mockImplementation: (fn: unknown) => void;
      }
    ).mockImplementation(() =>
      Promise.resolve({
        object: { reasoning: "material impact", suggestedSeverity: "critical" },
      } as never)
    );
    const res = await classifySeverity("exc_1", "reviewer_1");
    expect(res.currentSeverity).toBe("high");
    expect(res.suggestedSeverity).toBe("critical");
    expect(res.reasoning).toBe("material impact");
    expect(fakePrisma.exception.update).not.toHaveBeenCalled();
    expect(fakePrisma.auditLog.create).toHaveBeenCalled();
  });

  it("classifySeverity throws NotFound when missing", async () => {
    fakePrisma.exception.findUnique = mock(() =>
      Promise.resolve(null as never)
    );
    await expect(classifySeverity("nope")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("classifySeverity MOCK returns same severity deterministically", async () => {
    setEnv({ MOCK_AI: "true" });
    fakePrisma.exception.findUnique = mock(() =>
      Promise.resolve(exceptionFixture({ severity: "low" }) as never)
    );
    const res = await classifySeverity("exc_1");
    expect(res.suggestedSeverity).toBe("low");
    expect(res.model).toContain("mock");
  });

  it("suggestRule returns rule with server-filled id/timestamp/note and audit", async () => {
    (
      generateObjectMock as unknown as {
        mockImplementation: (fn: unknown) => void;
      }
    ).mockImplementation(() =>
      Promise.resolve({
        object: {
          condition: { field: "interestRate", operator: "gt", value: 12 },
          description: "Flag high rate",
          exceptionType: "rate_out_of_range",
          name: "high_rate_check",
          severity: "high",
        },
      } as never)
    );
    const res = await suggestRule(
      "Flag any loan with rate > 12%",
      "operator_1"
    );
    expect(res.rule.id).toMatch(/^ai_rule_/);
    expect(res.rule.name).toBe("high_rate_check");
    expect(res.promptSummary).toContain("Flag any loan");
    expect(res.note).toContain("AI-generated");
    expect(res.timestamp).toBeDefined();
    expect(fakePrisma.auditLog.create).toHaveBeenCalled();
  });

  it("suggestRule MOCK returns canned rule without SDK", async () => {
    setEnv({ MOCK_AI: "true" });
    const res = await suggestRule("Flag something");
    expect(res.rule.exceptionType).toBe("rate_out_of_range");
    expect(res.model).toContain("mock");
  });

  it("suggestRule propagates AiUnavailableError when no key", async () => {
    setEnv({ GEMINI_API_KEY: undefined, MOCK_AI: "false" });
    await expect(suggestRule("Flag ...")).rejects.toBeInstanceOf(
      AiUnavailableError
    );
  });

  it("summarizeBatch returns summary with mock without SDK", async () => {
    setEnv({ MOCK_AI: "true" });
    fakePrisma.uploadBatch.findUnique = mock(() =>
      Promise.resolve({ id: "batch_1" } as never)
    );
    fakePrisma.loan.count = mock(() => Promise.resolve(2 as never));
    fakePrisma.exception.groupBy = mock(() => Promise.resolve([] as never));
    const res = await summarizeBatch("batch_1", "reviewer_1");
    expect(res.batchId).toBe("batch_1");
    expect(res.summary).toContain("Mock summary");
    expect(res.model).toContain("mock");
  });

  it("summarizeBatch throws NotFound when batch missing", async () => {
    fakePrisma.uploadBatch.findUnique = mock(() =>
      Promise.resolve(null as never)
    );
    await expect(summarizeBatch("nope")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("summarizeBatch uses generateText and audits when actor provided", async () => {
    fakePrisma.uploadBatch.findUnique = mock(() =>
      Promise.resolve({ id: "batch_1" } as never)
    );
    fakePrisma.loan.count = mock(() => Promise.resolve(5 as never));
    let exceptionGroupByCalls = 0;
    fakePrisma.exception.groupBy = mock(() => {
      exceptionGroupByCalls += 1;
      if (exceptionGroupByCalls === 1) {
        return Promise.resolve([
          { _count: { exceptionType: 1 }, exceptionType: "missing_field" },
        ] as never);
      }
      return Promise.resolve([] as never);
    });
    (
      generateTextMock as unknown as {
        mockImplementation: (fn: unknown) => void;
      }
    ).mockImplementation(() =>
      Promise.resolve({ text: "Detailed summary." } as never)
    );
    const res = await summarizeBatch("batch_1", "reviewer_1");
    expect(res.summary).toBe("Detailed summary.");
    expect(fakePrisma.auditLog.create).toHaveBeenCalled();
  });
});
