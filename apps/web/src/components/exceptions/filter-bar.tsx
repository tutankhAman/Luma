import type { ExceptionStatus, ExceptionType, Severity } from "@repo/types";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExceptionListFilters } from "@/hooks/use-exceptions-filters";
import { useUploads } from "@/hooks/use-uploads";
import { cn } from "@/lib/utils";

const STATUS_TABS: { label: string; value: ExceptionStatus | "" }[] = [
  { label: "Open", value: "open" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Corrected", value: "corrected" },
  { label: "All", value: "" },
];

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

const EXCEPTION_TYPES: ExceptionType[] = [
  "missing_field",
  "duplicate",
  "date_error",
  "balance_error",
  "rate_out_of_range",
  "status_inconsistency",
  "stale_record",
  "conflicting_source",
  "invalid_state",
];

export function FilterBar({
  filters,
  onChange,
}: {
  filters: ExceptionListFilters;
  onChange: (partial: Partial<ExceptionListFilters>) => void;
}) {
  const { data: batches } = useUploads();
  const [searchDraft, setSearchDraft] = useState(filters.search);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDraft !== filters.search) {
        onChange({ search: searchDraft });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft, filters.search, onChange]);

  const hasFilters =
    Boolean(filters.search) ||
    Boolean(filters.severity) ||
    Boolean(filters.status) ||
    Boolean(filters.type) ||
    Boolean(filters.batchId);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div
          aria-label="Filter by status"
          className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1"
          role="tablist"
        >
          {STATUS_TABS.map((tab) => (
            <button
              aria-selected={filters.status === tab.value}
              className={cn(
                "rounded-md px-3 py-1 text-[13px] transition-colors",
                filters.status === tab.value
                  ? "border border-primary/30 bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={tab.label}
              onClick={() => onChange({ status: tab.value })}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Input
          className="h-8 w-56"
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search loan or borrower ID..."
          value={searchDraft}
        />

        <fieldset className="flex items-center gap-1 border-0 bg-transparent p-0">
          {SEVERITIES.map((severity) => (
            <button
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs capitalize transition-colors",
                filters.severity === severity
                  ? "border-primary/30 bg-primary/10 font-medium text-primary"
                  : "border-border text-muted-foreground hover:bg-accent/50"
              )}
              key={severity}
              onClick={() =>
                onChange({
                  severity: filters.severity === severity ? "" : severity,
                })
              }
              type="button"
            >
              {severity}
            </button>
          ))}
        </fieldset>

        {hasFilters ? (
          <Button
            onClick={() => {
              setSearchDraft("");
              onChange({
                batchId: "",
                page: 1,
                search: "",
                severity: "",
                status: "open",
                type: "",
              });
            }}
            size="sm"
            variant="ghost"
          >
            <i aria-hidden="true" className="ri-close-line text-base" />
            Clear
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          onValueChange={(value) =>
            onChange({ type: value === "all" ? "" : (value as ExceptionType) })
          }
          value={filters.type || "all"}
        >
          <SelectTrigger className="w-44" size="sm">
            <SelectValue placeholder="Exception type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {EXCEPTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) =>
            onChange({ batchId: !value || value === "all" ? "" : value })
          }
          value={filters.batchId || "all"}
        >
          <SelectTrigger className="w-48" size="sm">
            <SelectValue placeholder="Batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All batches</SelectItem>
            {(batches?.data ?? []).map((batch) => (
              <SelectItem key={batch.id} value={batch.id}>
                {batch.fileName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
