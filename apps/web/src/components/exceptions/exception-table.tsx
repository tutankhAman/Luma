import type { ExceptionListItem } from "@repo/types";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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

const SEVERITY_ORDER = { critical: 0, high: 1, low: 3, medium: 2 } as const;
const SEVERITY_DOT = {
  critical: "bg-destructive",
  high: "bg-destructive",
  low: "bg-success",
  medium: "bg-warning",
} as const;

type SortKey = "createdAt" | "severity";

const RAW_VALUE_PATTERN = /\(([^)]+)\)/;

function rawValue(message: string): string {
  const match = message.match(RAW_VALUE_PATTERN);
  return match?.[1] ?? "—";
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-14">
      <i
        aria-hidden="true"
        className="ri-inbox-line text-3xl text-muted-foreground/60"
      />
      <p className="font-medium text-muted-foreground text-sm">
        No exceptions found
      </p>
      <p className="text-[12px] text-muted-foreground/60">
        Try adjusting the filters, or ingest a new batch to validate.
      </p>
    </div>
  );
}

export function ExceptionQueueTable({
  data,
  pagination,
  isLoading,
  selectedId,
  onSelect,
  onPageChange,
}: {
  data?: ExceptionListItem[];
  pagination?: { page: number; total: number; totalPages: number };
  isLoading?: boolean;
  selectedId?: string | null;
  onSelect: (exception: ExceptionListItem) => void;
  onPageChange: (page: number) => void;
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
        {[0, 1, 2, 3, 4].map((row) => (
          <Skeleton className="h-10 w-full" key={row} />
        ))}
      </div>
    );
  }

  if (!sorted.length) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Loan ID
            </TableHead>
            <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Error Type
            </TableHead>
            <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Field
            </TableHead>
            <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Raw Value
            </TableHead>
            <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">
              {sortButton("severity", "Severity")}
            </TableHead>
            <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">
              AI Confidence
            </TableHead>
            <TableHead className="text-right text-[11px] text-muted-foreground uppercase tracking-wider">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((exception) => (
            <TableRow
              className={cn(
                "cursor-pointer transition-colors hover:bg-accent/50",
                selectedId === exception.id && "bg-accent"
              )}
              key={exception.id}
              onClick={() => onSelect(exception)}
            >
              <TableCell className="flex items-center gap-2 font-mono text-[13px]">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 rounded-full",
                    SEVERITY_DOT[exception.severity]
                  )}
                />
                {exception.loan.loanId ?? "—"}
              </TableCell>
              <TableCell className="font-medium text-[13px] text-destructive">
                {exception.exceptionType.replaceAll("_", " ")}
              </TableCell>
              <TableCell className="text-[13px] text-muted-foreground">
                {exception.field ?? "—"}
              </TableCell>
              <TableCell>
                <span className="rounded-full border border-destructive/25 bg-destructive/8 px-2 py-0.5 font-mono text-[12px] text-destructive">
                  {rawValue(exception.message)}
                </span>
              </TableCell>
              <TableCell>
                <SeverityDotLabel severity={exception.severity} />
              </TableCell>
              <TableCell>
                {exception.aiRecommendation ? (
                  <span className="flex items-center gap-1 text-[13px] text-primary">
                    <i aria-hidden="true" className="ri-sparkling-2-line" />
                    {Math.round(exception.aiRecommendation.confidence * 100)}%
                  </span>
                ) : (
                  <span className="text-[13px] text-muted-foreground/60">
                    —
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  className="h-8 text-[12px]"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(exception);
                  }}
                  size="sm"
                  variant="outline"
                >
                  Review
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between px-4 pb-3">
          <p className="text-[12px] text-muted-foreground tabular-nums">
            Page {pagination.page} of {pagination.totalPages} ·{" "}
            {pagination.total} exceptions
          </p>
          <div className="flex gap-2">
            <Button
              className="text-muted-foreground"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              size="sm"
              variant="outline"
            >
              <i aria-hidden="true" className="ri-arrow-left-line text-base" />
              Prev
            </Button>
            <Button
              className="text-muted-foreground"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              size="sm"
              variant="outline"
            >
              Next
              <i aria-hidden="true" className="ri-arrow-right-line text-base" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SeverityDotLabel({
  severity,
}: {
  severity: keyof typeof SEVERITY_DOT;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground capitalize">
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", SEVERITY_DOT[severity])}
      />
      {severity}
    </span>
  );
}
