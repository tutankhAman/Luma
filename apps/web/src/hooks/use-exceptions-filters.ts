import type { ExceptionStatus, ExceptionType, Severity } from "@repo/types";

export interface ExceptionListFilters {
  batchId: string;
  page: number;
  search: string;
  severity: Severity | "";
  status: ExceptionStatus | "";
  type: ExceptionType | "";
}

export const EMPTY_EXCEPTION_FILTERS: ExceptionListFilters = {
  batchId: "",
  page: 1,
  search: "",
  severity: "",
  status: "open",
  type: "",
};
