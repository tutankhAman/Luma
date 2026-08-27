import type { AuditEventType, AuditLogEntry } from "@repo/types";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditTrail } from "@/hooks/use-audit";
import { useVerifiedLoans } from "@/hooks/use-verified-loans";
import { downloadAsCsv } from "@/lib/download";
import { cn } from "@/lib/utils";

/* Spec §6.4 — Audit Trail Viewer (Module F). Loan-scoped timeline with a
   loan selector, event-type filter, and expandable entries (field edits show
   before/after). */

const EVENT_OPTIONS: { label: string; value: AuditEventType }[] = [
  { label: "File uploaded", value: "FILE_UPLOADED" },
  { label: "Record imported", value: "LOAN_IMPORTED" },
  { label: "Ingestion completed", value: "INGESTION_COMPLETED" },
  { label: "Validation executed", value: "VALIDATION_RUN" },
  { label: "Exception created", value: "EXCEPTION_CREATED" },
  { label: "AI recommendation", value: "AI_RECOMMENDATION" },
  { label: "Reviewer note", value: "REVIEWER_COMMENT" },
  { label: "Field edited", value: "FIELD_EDITED" },
  { label: "Approved", value: "LOAN_APPROVED" },
  { label: "Rejected", value: "LOAN_REJECTED" },
  { label: "Verified record created", value: "VERIFIED_RECORD_CREATED" },
  { label: "Record exported", value: "RECORD_EXPORTED" },
];

const EVENT_ICONS: Record<AuditEventType, string> = {
  AI_RECOMMENDATION: "ri-sparkling-2-line",
  EXCEPTION_CREATED: "ri-error-warning-line",
  FIELD_EDITED: "ri-edit-line",
  FILE_UPLOADED: "ri-upload-cloud-2-line",
  INGESTION_COMPLETED: "ri-inbox-archive-line",
  LOAN_APPROVED: "ri-checkbox-circle-line",
  LOAN_IMPORTED: "ri-download-cloud-2-line",
  LOAN_REJECTED: "ri-close-circle-line",
  RECORD_EXPORTED: "ri-share-box-line",
  REVIEWER_COMMENT: "ri-chat-3-line",
  VALIDATION_RUN: "ri-filter-3-line",
  VERIFIED_RECORD_CREATED: "ri-shield-check-line",
};

const EVENT_TONES: Partial<Record<AuditEventType, string>> = {
  EXCEPTION_CREATED: "text-destructive",
  LOAN_APPROVED: "text-success",
  LOAN_IMPORTED: "text-primary",
  LOAN_REJECTED: "text-destructive",
  VERIFIED_RECORD_CREATED: "text-success",
};

interface EntryMeta {
  field?: unknown;
  newValue?: unknown;
  oldValue?: unknown;
}

function describeEntry(entry: AuditLogEntry): string {
  const meta = (entry.metadata ?? {}) as Record<string, unknown>;
  switch (entry.eventType) {
    case "AI_RECOMMENDATION":
      return `AI suggestion generated (${String(meta.model ?? "model")})`;
    case "EXCEPTION_CREATED":
      return `Exception: ${String(meta.exceptionType ?? "unknown")} on ${String(meta.field ?? "field")}`;
    case "LOAN_IMPORTED":
      return `Imported from ${String(meta.fileName ?? "file")}, row ${String(meta.sourceRowNumber ?? "?")}`;
    case "REVIEWER_COMMENT":
      return String(meta.note ?? "Reviewer note added");
    default:
      return entry.eventType.replaceAll("_", " ").toLowerCase();
  }
}

function TimelineEntry({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const meta = (entry.metadata ?? {}) as EntryMeta;
  const hasDetail = meta.field !== undefined || meta.newValue !== undefined;
  const isEdit = entry.eventType === "FIELD_EDITED";

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <span
        aria-hidden="true"
        className={cn(
          "z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card",
          EVENT_TONES[entry.eventType] ?? "text-muted-foreground/60"
        )}
      >
        <i className={EVENT_ICONS[entry.eventType]} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <button
          className="flex w-full flex-wrap items-baseline gap-x-2 text-left"
          disabled={!hasDetail}
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          <span className="font-medium text-[13px]">
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
          {hasDetail ? (
            <i
              aria-hidden="true"
              className={cn(
                "text-[13px] text-muted-foreground/60 transition-transform",
                expanded && "rotate-90"
              )}
            />
          ) : null}
        </button>
        <p className="truncate text-muted-foreground text-xs">
          {describeEntry(entry)}
        </p>
        {expanded && hasDetail ? (
          <div className="mt-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
            {isEdit ? (
              <p className="flex flex-wrap items-center gap-2 text-[12px]">
                <span className="font-mono text-muted-foreground">
                  {String(meta.field ?? "field")}
                </span>
                <span className="text-destructive line-through">
                  {String(meta.oldValue ?? "—")}
                </span>
                <i
                  aria-hidden="true"
                  className="ri-arrow-right-line text-[11px] text-muted-foreground"
                />
                <span className="font-medium text-success">
                  {String(meta.newValue ?? "—")}
                </span>
              </p>
            ) : (
              <pre className="custom-scrollbar-hide overflow-x-auto font-mono text-[11px] leading-relaxed">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function LoanPicker({
  onPick,
  value,
}: {
  onPick: (loanId: string) => void;
  value: string;
}) {
  const [query, setQuery] = useState("");
  const { data } = useVerifiedLoans(1, query);
  const hits = (data?.data ?? []).slice(0, 6);

  return (
    <div className="space-y-2">
      <input
        className="h-9 w-full rounded-lg border border-input bg-card px-3 text-[13px] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search verified loans by ID…"
        type="search"
        value={query}
      />
      {query.trim().length > 0 ? (
        <ul className="overflow-hidden rounded-lg border border-border">
          {hits.length === 0 ? (
            <li className="px-3 py-2.5 text-[12.5px] text-muted-foreground">
              No verified loans match.
            </li>
          ) : (
            hits.map((record) => (
              <li key={record.id}>
                <button
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-accent",
                    value === record.id && "bg-accent"
                  )}
                  onClick={() => {
                    onPick(record.id);
                    setQuery("");
                  }}
                  type="button"
                >
                  <span className="font-mono">
                    {record.loan.loanId ?? record.id}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {record.recordHash.slice(0, 12)}…
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

export default function AuditTrailPage() {
  const navigate = useNavigate();
  const [loanId, setLoanId] = useState("");
  const [eventFilter, setEventFilter] = useState<AuditEventType | "">("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditTrail(loanId || "none", page);
  const { data: verified } = useVerifiedLoans(1, "");

  const entries = useMemo(() => {
    const raw = data?.data ?? [];
    const filtered =
      eventFilter === ""
        ? raw
        : raw.filter((entry) => entry.eventType === eventFilter);
    // API returns oldest-first; newest-first reads better in an audit viewer
    return [...filtered].reverse();
  }, [data, eventFilter]);

  function renderTimelineBody() {
    if (loanId === "") {
      return (
        <div className="flex flex-col items-center gap-2 py-16">
          <i
            aria-hidden="true"
            className="ri-history-line text-3xl text-muted-foreground/40"
          />
          <p className="font-medium text-[13.5px]">No loan selected</p>
          <p className="max-w-xs text-center text-[12.5px] text-muted-foreground">
            Pick a verified loan to inspect its complete, append-only event
            history.
          </p>
        </div>
      );
    }
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton className="h-12 w-full" key={row} />
          ))}
        </div>
      );
    }
    if (entries.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 py-16">
          <i
            aria-hidden="true"
            className="ri-inbox-line text-3xl text-muted-foreground/40"
          />
          <p className="text-[13px] text-muted-foreground">
            {eventFilter
              ? "No events of this type for the selected loan."
              : "No audit events for this loan."}
          </p>
        </div>
      );
    }
    return (
      <>
        <header className="mb-4 flex items-center justify-between">
          <p className="font-medium text-[12px] text-muted-foreground">
            {entries.length} of {data?.pagination.total ?? 0} events
            {eventFilter ? " · filtered" : ""}
          </p>
          <Button
            onClick={() => navigate(`/consumer/loans/${loanId}`)}
            size="sm"
            variant="ghost"
          >
            Open record
            <i aria-hidden="true" className="ri-arrow-right-s-line" />
          </Button>
          <Button
            onClick={() => {
              downloadAsCsv(
                `audit_trail_${loanId}.csv`,
                ["event_type", "actor", "timestamp", "detail"],
                entries.map((entry) => [
                  entry.eventType,
                  entry.actor?.name ?? "System",
                  entry.createdAt,
                  describeEntry(entry),
                ])
              );
              toast.success(`Downloaded ${entries.length} audit events`);
            }}
            size="sm"
            variant="outline"
          >
            <i aria-hidden="true" className="ri-download-2-line" />
            Export trail
          </Button>
        </header>
        <ol className="relative space-y-0">
          {entries.map((entry, index) => (
            <div key={entry.id}>
              {index < entries.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-8 bottom-0 left-[13px] w-px bg-border"
                />
              ) : null}
              <TimelineEntry entry={entry} />
            </div>
          ))}
        </ol>
        {(data?.pagination.totalPages ?? 1) > page ? (
          <Button
            className="mt-2"
            onClick={() => setPage(page + 1)}
            size="sm"
            variant="outline"
          >
            Load older events
          </Button>
        ) : null}
      </>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-8">
      <PageHeader
        description="Every event on a record — ingests, validations, AI output, decisions, exports. Append-only."
        eyebrow="Data Consumer"
        title="Audit Trail"
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold text-[13px] tracking-tight">
              Select a loan
            </h3>
            <LoanPicker onPick={setLoanId} value={loanId} />
            {loanId ? (
              <button
                className="mt-2 text-[12px] text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setLoanId("")}
                type="button"
              >
                Clear selection
              </button>
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold text-[13px] tracking-tight">
              Filter by event
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <button
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
                  eventFilter === ""
                    ? "border-primary/30 bg-primary/10 font-medium text-primary"
                    : "border-border text-muted-foreground hover:bg-accent/50"
                )}
                onClick={() => setEventFilter("")}
                type="button"
              >
                All
              </button>
              {EVENT_OPTIONS.map((option) => (
                <button
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
                    eventFilter === option.value
                      ? "border-primary/30 bg-primary/10 font-medium text-primary"
                      : "border-border text-muted-foreground hover:bg-accent/50"
                  )}
                  key={option.value}
                  onClick={() => setEventFilter(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          {verified && verified.data.length > 0 ? (
            <section className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 font-semibold text-[13px] tracking-tight">
                Recently verified
              </h3>
              <ul className="space-y-1">
                {verified.data.slice(0, 5).map((record) => (
                  <li key={record.id}>
                    <button
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/50",
                        loanId === record.id && "bg-accent"
                      )}
                      onClick={() => setLoanId(record.id)}
                      type="button"
                    >
                      <span className="font-mono text-[12px]">
                        {record.loan.loanId ?? record.id}
                      </span>
                      <Badge
                        variant={
                          record.validationResult === "passed"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {record.validationResult.replaceAll("_", " ")}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>

        <section className="rounded-xl border border-border bg-card p-5">
          {renderTimelineBody()}
        </section>
      </div>
    </div>
  );
}
