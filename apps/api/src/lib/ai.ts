import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export class AiUnavailableError extends Error {
  constructor(message = "AI unavailable") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export const AI_MODEL_ID = process.env.AI_MODEL_ID ?? "gemini-2.0-flash";

export const isMockAi = (): boolean => process.env.MOCK_AI === "true";

export const isAiConfigured = (): boolean =>
  isMockAi() || Boolean(process.env.GEMINI_API_KEY);

let cachedModel: LanguageModel | null = null;

export const getModel = (): LanguageModel => {
  if (isMockAi()) {
    throw new AiUnavailableError("Mock AI is enabled — real model not needed");
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiUnavailableError("GEMINI_API_KEY is not configured");
  }
  if (!cachedModel) {
    const provider = createGoogleGenerativeAI({ apiKey });
    cachedModel = provider(AI_MODEL_ID) as unknown as LanguageModel;
  }
  return cachedModel;
};

export const __resetAiModelCache = (): void => {
  cachedModel = null;
};
