import type { AuditEventType, AuditLogEntry } from "@repo/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditTrail } from "@/hooks/use-audit";
import { cn } from "@/lib/utils";

const EVENT_ICONS: Record<AuditEventType, string> = {
  AI_RECOMMENDATION: "ri-robot-2-line",
  EXCEPTION_CREATED: "ri-error-warning-line",
  FIELD_EDITED: "ri-edit-line",
  FILE_UPLOADED: "ri-upload-2-line",
  INGESTION_COMPLETED: "ri-list-check-2",
  LOAN_APPROVED: "ri-checkbox-circle-line",
  LOAN_IMPORTED: "ri-download-line",
  LOAN_REJECTED: "ri-close-circle-line",
  RECORD_EXPORTED: "ri-share-box-line",
  REVIEWER_COMMENT: "ri-chat-3-line",
  VALIDATION_RUN: "ri-play-circle-line",
  VERIFIED_RECORD_CREATED: "ri-shield-check-line",
};

const EVENT_COLORS: Partial<Record<AuditEventType, string>> = {
  EXCEPTION_CREATED: "text-rose-500",
  LOAN_APPROVED: "text-emerald-500",
  LOAN_REJECTED: "text-rose-500",
  VERIFIED_RECORD_CREATED: "text-indigo-500",
};

function describeEntry(entry: AuditLogEntry): string {
  const meta = (entry.metadata ?? {}) as Record<string, unknown>;
  switch (entry.eventType) {
    case "AI_RECOMMENDATION":
      return `AI suggestion generated (${String(meta.model ?? "model")}, ${String(meta.promptSummary ?? "")})`;
    case "EXCEPTION_CREATED":
      return `Exception: ${String(meta.exceptionType ?? "unknown")} on ${String(meta.field ?? "field")}`;
    case "FIELD_EDITED":
      return `Field ${String(meta.field ?? "")} changed from ${String(meta.oldValue ?? "?")} to ${String(meta.newValue ?? "?")}`;
    case "LOAN_IMPORTED":
      return `Imported from ${String(meta.fileName ?? "file")}, row ${String(meta.sourceRowNumber ?? "?")}`;
    case "REVIEWER_COMMENT":
      return String(meta.note ?? "Reviewer note added");
    default:
      return entry.eventType.replaceAll("_", " ").toLowerCase();
  }
}

export function AuditTimeline({ loanId }: { loanId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditTrail(loanId, page);
  const entries = data?.data ?? [];
  const hasMore = (data?.pagination.totalPages ?? 1) > page;

  return (
    <Card className="rounded-2xl border-slate-100 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
      <CardHeader>
        <CardTitle className="text-slate-900">Audit timeline</CardTitle>
        <CardDescription className="text-slate-500">
          Append-only history — oldest first. {data?.pagination.total ?? 0}{" "}
          events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((row) => (
              <Skeleton className="h-12 w-full" key={row} />
            ))}
          </div>
        ) : (
          <ol className="relative space-y-0">
            {entries.map((entry, index) => (
              <li className="relative flex gap-3 pb-5 last:pb-0" key={entry.id}>
                {index < entries.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-8 bottom-0 left-[13px] w-px bg-slate-100"
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className={cn(
                    "z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-white",
                    EVENT_COLORS[entry.eventType] ?? "text-slate-400"
                  )}
                >
                  <i className={EVENT_ICONS[entry.eventType]} />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium text-[13px] text-slate-900">
                      {entry.eventType.replaceAll("_", " ")}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {entry.actor?.name ?? "System"} ·{" "}
                      {new Date(entry.createdAt).toLocaleString(undefined, {
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </p>
                  <p className="truncate text-muted-foreground text-xs">
                    {describeEntry(entry)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
        {hasMore ? (
          <Button
            className="mt-3"
            onClick={() => setPage(page + 1)}
            size="sm"
            variant="outline"
          >
            Load more
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
