import type {
  ExceptionListItem,
  ExceptionStatus,
  ExceptionType,
  Severity,
} from "@repo/types";
import { useMemo, useState } from "react";
import {
  ExceptionStatusBadge,
  ExceptionTypeBadge,
  SeverityBadge,
} from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  low: 3,
  medium: 2,
};

type SortKey = "createdAt" | "severity";

interface FilterSelectProps {
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  value: string;
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: FilterSelectProps) {
  return (
    <Select onValueChange={(next) => onChange(next ?? "all")} value={value}>
      <SelectTrigger className="w-40" size="sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option.replaceAll("_", " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ExceptionQueueTable({
  data,
  isLoading,
  search,
  onSearchChange,
  severity,
  onSeverityChange,
  status,
  onStatusChange,
  type,
  onTypeChange,
  onReview,
}: {
  data?: ExceptionListItem[];
  isLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  severity: Severity | "";
  onSeverityChange: (value: Severity | "") => void;
  status: ExceptionStatus | "";
  onStatusChange: (value: ExceptionStatus | "") => void;
  type: ExceptionType | "";
  onTypeChange: (value: ExceptionType | "") => void;
  onReview: (exception: ExceptionListItem) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("severity");

  const sorted = useMemo(() => {
    const rows = [...(data ?? [])];
    rows.sort((a, b) => {
      if (sortKey === "severity") {
        return (
          SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
          b.createdAt.localeCompare(a.createdAt)
        );
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
    return rows;
  }, [data, sortKey]);

  const sortButton = (key: SortKey, label: string) => (
    <button
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground",
        sortKey === key && "text-foreground"
      )}
      onClick={() => setSortKey(key)}
      type="button"
    >
      <i aria-hidden="true" className="ri-arrow-up-down-line text-sm" />
      {label}
    </button>
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((row) => (
          <Skeleton className="h-10 w-full" key={row} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="h-8 w-56"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search loan or borrower ID..."
          value={search}
        />
        <FilterSelect
          onChange={(value) =>
            onStatusChange(value === "all" ? "" : (value as ExceptionStatus))
          }
          options={["open", "approved", "rejected", "corrected"]}
          placeholder="Status"
          value={status || "all"}
        />
        <FilterSelect
          onChange={(value) =>
            onSeverityChange(value === "all" ? "" : (value as Severity))
          }
          options={["critical", "high", "medium", "low"]}
          placeholder="Severity"
          value={severity || "all"}
        />
        <FilterSelect
          onChange={(value) =>
            onTypeChange(value === "all" ? "" : (value as ExceptionType))
          }
          options={[
            "missing_field",
            "duplicate",
            "date_error",
            "balance_error",
            "rate_out_of_range",
            "status_inconsistency",
            "stale_record",
            "conflicting_source",
            "invalid_state",
          ]}
          placeholder="Type"
          value={type || "all"}
        />
        <span className="ml-auto text-muted-foreground text-xs tabular-nums">
          {sorted.length} exception{sorted.length === 1 ? "" : "s"}
        </span>
      </div>

      {sorted.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground text-sm">
          No exceptions match the current filters.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loan</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>{sortButton("severity", "Severity")}</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{sortButton("createdAt", "Detected")}</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((exception) => (
              <TableRow key={exception.id}>
                <TableCell className="font-medium">
                  {exception.loan.loanId}
                </TableCell>
                <TableCell>
                  <ExceptionTypeBadge type={exception.exceptionType} />
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={exception.severity} />
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground text-xs">
                  {exception.message}
                </TableCell>
                <TableCell>
                  <ExceptionStatusBadge status={exception.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(exception.createdAt).toLocaleString(undefined, {
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "short",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    onClick={() => onReview(exception)}
                    size="sm"
                    variant="outline"
                  >
                    <i
                      aria-hidden="true"
                      className="ri-review-line text-base"
                    />
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
