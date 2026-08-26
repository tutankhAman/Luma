import type { Role } from "@repo/types";

/**
 * Narrow better-auth's `string` role to the app contract `Role`.
 * Unknown or non-standard values fail closed (return null -> 401).
 * Supported Better Auth roles outside the app set (e.g. "admin") are treated as unsupported.
 */
export const normalizeRole = (
  value: string | null | undefined
): Role | null => {
  if (
    value === "data_operator" ||
    value === "reviewer" ||
    value === "data_consumer"
  ) {
    return value;
  }
  if (value !== null && value !== undefined && value !== "") {
    process.stderr.write(`[roles] unsupported role "${value}" rejected\n`);
  }
  return null;
};
