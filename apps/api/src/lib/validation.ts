import { z } from "zod";

export const cuidSchema = z.cuid2().or(z.cuid());

export const mapZodIssuesToFields = (
  issues: z.ZodIssue[]
): Record<string, string> =>
  Object.fromEntries(
    issues.map((issue) => [issue.path.join("."), issue.message])
  );
