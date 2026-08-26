import type { ExceptionListItem } from "@repo/types";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ExceptionStatusBadge,
  ExceptionTypeBadge,
  SeverityBadge,
} from "@/components/ui/badges";
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

type SortKey = "createdAt" | "severity";

export interface ExceptionPage {
  data?: ExceptionListItem[];
  pagination?: { page: number; total: number; totalPages: number };
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-14">
      <i aria-hidden="true" className="ri-inbox-line text-3xl text-[#52525B]" />
      <p className="font-medium text-[#A1A1AA] text-sm">No exceptions found</p>
      <p className="text-[#A1A1AA] text-xs">
        Try adjusting the filters, or ingest a new batch to validate.
      </p>
    </div>
  );
}

export function ExceptionQueueTable({
  data,
  pagination,
  isLoading,
  onPageChange,
  onReview,
}: {
  data?: ExceptionListItem[];
  pagination?: { page: number; total: number; totalPages: number };
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onReview: (exception: ExceptionListItem) => void;
}) {
  const navigate = useNavigate();
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

  const openLoan = (exception: ExceptionListItem) => {
    navigate(`/reviewer/loans/${exception.loan.id}`);
  };

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
          <TableRow>
            <TableHead>{sortButton("severity", "Severity")}</TableHead>
            <TableHead>Loan ID</TableHead>
            <TableHead>Borrower</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Field</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>{sortButton("createdAt", "Detected")}</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((exception) => (
            <TableRow
              className="cursor-pointer"
              key={exception.id}
              onClick={() => openLoan(exception)}
            >
              <TableCell>
                <SeverityBadge severity={exception.severity} />
              </TableCell>
              <TableCell className="font-medium">
                {exception.loan.loanId}
              </TableCell>
              <TableCell className="text-[#A1A1AA]">
                {exception.loan.borrowerId}
              </TableCell>
              <TableCell>
                <ExceptionTypeBadge type={exception.exceptionType} />
              </TableCell>
              <TableCell className="font-mono text-[#A1A1AA] text-xs">
                {exception.field}
              </TableCell>
              <TableCell className="max-w-xs truncate text-[#A1A1AA] text-xs">
                {exception.message}
              </TableCell>
              <TableCell>
                <ExceptionStatusBadge status={exception.status} />
              </TableCell>
              <TableCell className="text-[#A1A1AA] text-xs">
                {new Date(exception.createdAt).toLocaleString(undefined, {
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "short",
                })}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  onClick={(event) => {
                    event.stopPropagation();
                    onReview(exception);
                  }}
                  size="sm"
                  variant="outline"
                >
                  <i aria-hidden="true" className="ri-review-line text-base" />
                  Review
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-[#A1A1AA] text-xs tabular-nums">
            Page {pagination.page} of {pagination.totalPages} ·{" "}
            {pagination.total} exceptions
          </p>
          <div className="flex gap-2">
            <Button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              size="sm"
              variant="outline"
            >
              <i aria-hidden="true" className="ri-arrow-left-line text-base" />
              Prev
            </Button>
            <Button
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
