import { DEFAULT_USER_ROLE, type Role } from "@repo/types";

/**
 * Narrow better-auth's `string` role to the app contract `Role`.
 * Falls back to the schema/better-auth default (`data_consumer`) for unknown values.
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
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return DEFAULT_USER_ROLE;
};
