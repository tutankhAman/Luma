import { createHash } from "node:crypto";

/**
 * Deterministic canonicalization per security rules S5.
 * - Sorted keys (alphabetical) for stable ordering
 * - Undefined values omitted (no `undefined` in JSON)
 * - Decimal-like values already stringified before calling
 * - No locale formatting, no pretty-print spaces
 */
export const canonicalize = (data: Record<string, unknown>): string => {
  const sortedKeys = Object.keys(data).sort();
  const sorted: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    const value = data[key];
    if (value !== undefined) {
      sorted[key] = value;
    }
  }
  return JSON.stringify(sorted);
};

export const computeRecordHash = (
  canonicalData: Record<string, unknown>
): string =>
  createHash("sha256").update(canonicalize(canonicalData)).digest("hex");

/**
 * Normalize a Decimal / number / string monetary value to a stable string.
 * Preserves scale without locale formatting. Used before hashing.
 * - Prisma Decimal -> String(decimal) (e.g. "350000.00")
 * - number -> String(number)
 * - string trimmed -> as-is
 * - null/undefined -> null
 */
export const normalizeDecimalString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return String(value);
};

export const normalizeDateString = (
  value: Date | string | null | undefined
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return value.toISOString().slice(0, 10);
  }
  return null;
};
