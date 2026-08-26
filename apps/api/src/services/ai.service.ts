import { exceptionTypeSchema, severitySchema } from "@repo/types";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import {
  AI_MODEL_ID,
  AiUnavailableError,
  getModel,
  isAiConfigured,
  isMockAi,
  NotFoundError,
} from "../lib/ai.js";
import { prisma } from "../lib/prisma.js";

// ── GenerateObject schemas (model only generates the inner payload; server injects model/timestamp/promptSummary) ──

const explainGenerationSchema = z.object({
  confidence: z.number().min(0).max(1),
  fieldsToChange: z
    .array(
      z.object({
        currentValue: z.string().nullable().optional(),
        field: z.string().min(1),
        source: z.string().optional(),
        suggestedValue: z.string().min(1),
      })
    )
    .min(1),
  reasoning: z.string().min(1),
  suggestion: z.string().min(1),
});

const classifyGenerationSchema = z.object({
  reasoning: z.string().min(1),
  suggestedSeverity: severitySchema,
});

const suggestRuleGenerationSchema = z.object({
  condition: z.unknown(),
  description: z.string().min(1),
  exceptionType: exceptionTypeSchema,
  name: z.string().min(1),
  severity: severitySchema,
});

// ── Helpers ──

const toSafeString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "null";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

const decimalToString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
};

const buildExplainPrompt = (params: {
  conflictContext: string | null;
  exception: {
    exceptionType: string;
    field: string | null;
    message: string;
    severity: string;
  };
  loan: Record<string, unknown>;
}): string => {
  const { exception, loan, conflictContext } = params;
  const loanSnapshot = [
    `loanId=${toSafeString(loan.loanId)}`,
    `borrowerId=${toSafeString(loan.borrowerId)}`,
    `borrowerState=${toSafeString(loan.borrowerState)}`,
    `currentBalance=${decimalToString(loan.currentBalance) ?? "null"}`,
    `originalPrincipal=${decimalToString(loan.originalPrincipal) ?? "null"}`,
    `interestRate=${decimalToString(loan.interestRate) ?? "null"}`,
    `paymentStatus=${toSafeString(loan.paymentStatus)}`,
    `daysPastDue=${toSafeString(loan.daysPastDue)}`,
    `creditGrade=${toSafeString(loan.creditGrade)}`,
    `servicerName=${toSafeString(loan.servicerName)}`,
    `documentStatus=${toSafeString(loan.documentStatus)}`,
  ].join(", ");

  const lines = [
    "You are a loan data quality analyst for Luma, a Loan Data Verification Copilot.",
    `Exception: type=${exception.exceptionType}, severity=${exception.severity}, field=${exception.field ?? "n/a"}, message="${exception.message}".`,
    `Loan snapshot: ${loanSnapshot}.`,
  ];
  if (conflictContext) {
    lines.push(`Servicer conflict context: ${conflictContext}`);
  }
  lines.push(
    "Explain why this exception occurred, assess data lineage, and suggest the most reliable corrected value(s).",
    "Consider servicer data more recent/operational when it conflicts with tape data, but state your reasoning."
  );
  return lines.join("\n");
};

const buildSummarizePrompt = (params: {
  batchId: string;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  failedValidation: number;
  passedValidation: number;
  totalImported: number;
}): string =>
  [
    "You are a loan data quality analyst summarizing a batch of validated loans for a Data Operator.",
    `Batch ${params.batchId}: ${params.totalImported} loans imported (${params.passedValidation} passed, ${params.failedValidation} failed validation).`,
    `Exceptions by type: ${JSON.stringify(params.byType)}.`,
    `Exceptions by severity: ${JSON.stringify(params.bySeverity)}.`,
    "Write a concise 3-5 sentence summary highlighting the most common issues, severity distribution, and what needs reviewer attention. No markdown, plain prose.",
  ].join("\n");

const buildClassifyPrompt = (params: {
  currentSeverity: string;
  exception: { exceptionType: string; field: string | null; message: string };
  loanId: string | null;
}): string =>
  [
    "You are a loan data quality analyst re-evaluating exception severity.",
    `Loan ${params.loanId ?? "unknown"} — exception type=${params.exception.exceptionType}, field=${params.exception.field ?? "n/a"}, message="${params.exception.message}", current severity=${params.currentSeverity}.`,
    "Consider financial materiality, data-trust impact, and downstream reporting risk. Suggest the appropriate severity and explain why.",
  ].join("\n");

const buildSuggestRulePrompt = (prompt: string): string =>
  [
    "You are a validation-rule engineer for Luma.",
    `User request: "${prompt}"`,
    "Return a single structured validation rule as JSON with: name (snake_case), description, condition (JSON object describing the field/operator/value logic), severity (critical|high|medium|low), exceptionType (one of: missing_field, duplicate, date_error, balance_error, rate_out_of_range, status_inconsistency, stale_record, invalid_state, conflicting_source).",
  ].join("\n");

// ── Mock helpers (MOCK_AI=true or no key) ──

const mockExplainRecommendation = (params: {
  exception: { exceptionType: string; field: string | null; message: string };
  loan: Record<string, unknown>;
}): {
  confidence: number;
  fieldsToChange: Array<{
    currentValue: string | null;
    field: string;
    source: string;
    suggestedValue: string;
  }>;
  reasoning: string;
  suggestion: string;
} => {
  const field = params.exception.field ?? "currentBalance";
  const currentValue =
    decimalToString((params.loan as Record<string, unknown>)[field]) ??
    toSafeString((params.loan as Record<string, unknown>)[field]);
  let suggestedValue: string;
  if (field === "currentBalance" || field === "originalPrincipal") {
    suggestedValue = "340000";
  } else if (field === "interestRate") {
    suggestedValue = "6.5";
  } else if (field === "borrowerState") {
    suggestedValue = "CA";
  } else {
    suggestedValue = "corrected_value";
  }
  return {
    confidence: 0.84,
    fieldsToChange: [
      {
        currentValue: currentValue === "null" ? null : currentValue,
        field,
        source: "mock",
        suggestedValue,
      },
    ],
    reasoning: `Mock AI: ${params.exception.exceptionType} on field '${field}' — ${params.exception.message}. This is a deterministic mock recommendation for testing.`,
    suggestion: `Set ${field} to ${suggestedValue}`,
  };
};

// ── Public API ──

const AI_UNAVAILABLE_MSG = "AI unavailable";

export const explainException = async (
  exceptionId: string,
  actorId?: string
): Promise<{
  exceptionId: string;
  recommendation: {
    confidence: number;
    fieldsToChange: Array<{
      currentValue?: string | null;
      field: string;
      source?: string;
      suggestedValue: string;
    }>;
    model: string;
    promptSummary: string;
    reasoning: string;
    suggestion: string;
    timestamp: string;
  };
}> => {
  const exception = await prisma.exception.findUnique({
    include: {
      loan: {
        select: {
          borrowerId: true,
          borrowerState: true,
          creditGrade: true,
          currentBalance: true,
          daysPastDue: true,
          documentStatus: true,
          id: true,
          interestRate: true,
          loanId: true,
          originalPrincipal: true,
          paymentStatus: true,
          servicerName: true,
        },
      },
    },
    where: { id: exceptionId },
  });

  if (!exception) {
    throw new NotFoundError("Exception not found");
  }

  const loanFields = exception.loan as unknown as Record<string, unknown>;
  const metadata = exception.metadata as Record<string, unknown> | null;
  let conflictContext: string | null = null;
  if (metadata?.conflictBatchId) {
    conflictContext = `conflicting_source metadata: sourceValue=${toSafeString(metadata.sourceValue)} targetValue=${toSafeString(metadata.targetValue)} field=${toSafeString(metadata.field ?? exception.field)} sourceBatch=${toSafeString(metadata.conflictBatchId)}`;
  } else if (metadata && Object.keys(metadata).length > 0) {
    conflictContext = `exception metadata: ${JSON.stringify(metadata).slice(0, 500)}`;
  }

  const promptSummary = `Explain ${exception.exceptionType} on ${exception.field ?? "n/a"} for loan ${exception.loan.loanId ?? exception.loan.id}`;
  const prompt = buildExplainPrompt({
    conflictContext,
    exception: {
      exceptionType: exception.exceptionType,
      field: exception.field,
      message: exception.message,
      severity: exception.severity,
    },
    loan: loanFields,
  });

  let generation: z.infer<typeof explainGenerationSchema>;
  let modelId = AI_MODEL_ID;

  if (isMockAi()) {
    modelId = `mock-${AI_MODEL_ID}`;
    generation = mockExplainRecommendation({
      exception: {
        exceptionType: exception.exceptionType,
        field: exception.field,
        message: exception.message,
      },
      loan: loanFields,
    });
  } else {
    if (!isAiConfigured()) {
      throw new AiUnavailableError(AI_UNAVAILABLE_MSG);
    }
    const model = getModel();
    try {
      const result = await generateObject({
        model,
        prompt,
        schema: explainGenerationSchema,
      });
      generation = result.object;
    } catch {
      throw new AiUnavailableError(AI_UNAVAILABLE_MSG);
    }
  }

  const timestamp = new Date().toISOString();
  const recommendation = {
    confidence: generation.confidence,
    fieldsToChange: generation.fieldsToChange.map((f) => ({
      currentValue: f.currentValue ?? null,
      field: f.field,
      source: f.source ?? "ai",
      suggestedValue: f.suggestedValue,
    })),
    model: modelId,
    promptSummary,
    reasoning: generation.reasoning,
    suggestion: generation.suggestion,
    timestamp,
  };

  await prisma.$transaction(async (tx) => {
    await tx.exception.update({
      data: { aiRecommendation: recommendation as never },
      where: { id: exceptionId },
    });
    await tx.auditLog.create({
      data: {
        actorId: actorId ?? null,
        eventType: "AI_RECOMMENDATION",
        exceptionId,
        loanId: exception.loanId,
        metadata: {
          confidence: recommendation.confidence,
          kind: "explain",
          model: modelId,
          promptSummary,
          timestamp,
        },
      },
    });
  });

  return { exceptionId, recommendation };
};

export const summarizeBatch = async (
  batchId: string,
  actorId?: string
): Promise<{
  batchId: string;
  model: string;
  summary: string;
  timestamp: string;
}> => {
  const batch = await prisma.uploadBatch.findUnique({
    where: { id: batchId },
  });
  if (!batch) {
    throw new NotFoundError("Batch not found");
  }

  const totalImported = await prisma.loan.count({
    where: { sourceBatchId: batchId },
  });
  const [byType, bySeverity, failedValidation] = await Promise.all([
    prisma.exception.groupBy({
      _count: { exceptionType: true },
      by: ["exceptionType"],
      where: { loan: { sourceBatchId: batchId } },
    }),
    prisma.exception.groupBy({
      _count: { severity: true },
      by: ["severity"],
      where: { loan: { sourceBatchId: batchId } },
    }),
    prisma.loan.count({
      where: { exceptions: { some: {} }, sourceBatchId: batchId },
    }),
  ]);

  const byTypeMap: Record<string, number> = {};
  for (const row of byType) {
    byTypeMap[row.exceptionType] = row._count.exceptionType ?? 0;
  }
  const bySeverityMap: Record<string, number> = {};
  for (const row of bySeverity) {
    bySeverityMap[row.severity] = row._count.severity ?? 0;
  }
  const passedValidation = Math.max(0, totalImported - failedValidation);

  const prompt = buildSummarizePrompt({
    batchId,
    bySeverity: bySeverityMap,
    byType: byTypeMap,
    failedValidation,
    passedValidation,
    totalImported,
  });

  let summaryText: string;
  let modelId = AI_MODEL_ID;

  if (isMockAi()) {
    modelId = `mock-${AI_MODEL_ID}`;
    const topType =
      Object.entries(byTypeMap).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "no issues";
    summaryText = `Mock summary: batch ${batchId} — ${totalImported} loans (${passedValidation} passed, ${failedValidation} failed). Top exception type: ${topType}. Severity spread: ${JSON.stringify(bySeverityMap)}.`;
  } else {
    if (!isAiConfigured()) {
      throw new AiUnavailableError(AI_UNAVAILABLE_MSG);
    }
    const model = getModel();
    try {
      const result = await generateText({ model, prompt });
      summaryText = result.text;
    } catch {
      throw new AiUnavailableError(AI_UNAVAILABLE_MSG);
    }
  }

  const timestamp = new Date().toISOString();

  if (actorId) {
    await prisma.auditLog.create({
      data: {
        actorId,
        batchId,
        eventType: "AI_RECOMMENDATION",
        metadata: {
          batchId,
          kind: "summarize_batch",
          model: modelId,
          timestamp,
        },
      },
    });
  }

  return { batchId, model: modelId, summary: summaryText, timestamp };
};

export const classifySeverity = async (
  exceptionId: string,
  actorId?: string
): Promise<{
  currentSeverity: string;
  exceptionId: string;
  model: string;
  reasoning: string;
  suggestedSeverity: string;
  timestamp: string;
}> => {
  const exception = await prisma.exception.findUnique({
    include: { loan: { select: { id: true, loanId: true } } },
    where: { id: exceptionId },
  });
  if (!exception) {
    throw new NotFoundError("Exception not found");
  }

  const currentSeverity = exception.severity;
  const prompt = buildClassifyPrompt({
    currentSeverity,
    exception: {
      exceptionType: exception.exceptionType,
      field: exception.field,
      message: exception.message,
    },
    loanId: exception.loan.loanId,
  });

  let suggestedSeverity: string;
  let reasoning: string;
  let modelId = AI_MODEL_ID;

  if (isMockAi()) {
    modelId = `mock-${AI_MODEL_ID}`;
    suggestedSeverity = currentSeverity;
    reasoning = `Mock classification: ${exception.exceptionType} severity ${currentSeverity} is appropriate.`;
  } else {
    if (!isAiConfigured()) {
      throw new AiUnavailableError(AI_UNAVAILABLE_MSG);
    }
    const model = getModel();
    try {
      const result = await generateObject({
        model,
        prompt,
        schema: classifyGenerationSchema,
      });
      suggestedSeverity = result.object.suggestedSeverity;
      reasoning = result.object.reasoning;
    } catch {
      throw new AiUnavailableError(AI_UNAVAILABLE_MSG);
    }
  }

  const timestamp = new Date().toISOString();

  if (actorId) {
    await prisma.auditLog.create({
      data: {
        actorId,
        eventType: "AI_RECOMMENDATION",
        exceptionId,
        loanId: exception.loanId,
        metadata: {
          currentSeverity,
          kind: "classify_severity",
          model: modelId,
          reasoning,
          suggestedSeverity,
          timestamp,
        },
      },
    });
  }

  return {
    currentSeverity,
    exceptionId,
    model: modelId,
    reasoning,
    suggestedSeverity,
    timestamp,
  };
};

export const suggestRule = async (
  promptText: string,
  actorId?: string
): Promise<{
  model: string;
  note: string;
  promptSummary: string;
  rule: {
    condition: unknown;
    description: string;
    exceptionType: string;
    id: string;
    name: string;
    severity: string;
  };
  timestamp: string;
}> => {
  const promptSummary = promptText.slice(0, 80);
  const fullPrompt = buildSuggestRulePrompt(promptText);

  let rulePayload: z.infer<typeof suggestRuleGenerationSchema>;
  let modelId = AI_MODEL_ID;

  if (isMockAi()) {
    modelId = `mock-${AI_MODEL_ID}`;
    rulePayload = {
      condition: { field: "interestRate", operator: "gt", value: 12 },
      description: promptText,
      exceptionType: "rate_out_of_range",
      name: "ai_generated_rule",
      severity: "high",
    };
  } else {
    if (!isAiConfigured()) {
      throw new AiUnavailableError(AI_UNAVAILABLE_MSG);
    }
    const model = getModel();
    try {
      const result = await generateObject({
        model,
        prompt: fullPrompt,
        schema: suggestRuleGenerationSchema,
      });
      rulePayload = result.object;
    } catch {
      throw new AiUnavailableError(AI_UNAVAILABLE_MSG);
    }
  }

  const timestamp = new Date().toISOString();
  const ruleId = `ai_rule_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const rule = {
    condition: rulePayload.condition,
    description: rulePayload.description,
    exceptionType: rulePayload.exceptionType,
    id: ruleId,
    name: rulePayload.name,
    severity: rulePayload.severity,
  };
  const note =
    "This rule was AI-generated. Review before applying to production validation.";

  if (actorId) {
    await prisma.auditLog.create({
      data: {
        actorId,
        eventType: "AI_RECOMMENDATION",
        metadata: {
          kind: "suggest_rule",
          model: modelId,
          promptSummary,
          ruleId,
          timestamp,
        },
      },
    });
  }

  return { model: modelId, note, promptSummary, rule, timestamp };
};
