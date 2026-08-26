import type { Role } from "@repo/types";

/**
 * Narrow better-auth's `string` role to the app contract `Role`.
 * Unknown or non-standard values fail closed (return null -> 401).
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
  return null;
};
