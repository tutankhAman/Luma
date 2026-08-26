import type { ExceptionStatus, ExceptionType, Severity } from "@repo/types";

export interface ExceptionListFilters {
  page: number;
  search: string;
  severity: Severity | "";
  status: ExceptionStatus | "";
  type: ExceptionType | "";
}

export const EMPTY_EXCEPTION_FILTERS: ExceptionListFilters = {
  page: 1,
  search: "",
  severity: "",
  status: "open",
  type: "",
};
