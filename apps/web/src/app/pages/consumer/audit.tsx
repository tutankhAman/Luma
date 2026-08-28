import type { AuditEventType, AuditLogEntry } from "@repo/types";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { KpiCard, KpiStrip } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditTrail } from "@/hooks/use-audit";
import { useVerifiedLoans } from "@/hooks/use-verified-loans";
import { downloadAsCsv } from "@/lib/download";
import { cn } from "@/lib/utils";

/* Spec §6.4 — Audit Trail Viewer (Module F). */

const EVENT_OPTIONS: { label: string; tone: string; value: AuditEventType }[] =
  [
    {
      label: "File uploaded",
      tone: "text-muted-foreground",
      value: "FILE_UPLOADED",
    },
    { label: "Record imported", tone: "text-primary", value: "LOAN_IMPORTED" },
    {
      label: "Ingestion completed",
      tone: "text-muted-foreground",
      value: "INGESTION_COMPLETED",
    },
    {
      label: "Validation executed",
      tone: "text-primary",
      value: "VALIDATION_RUN",
    },
    {
      label: "Exception created",
      tone: "text-destructive",
      value: "EXCEPTION_CREATED",
    },
    {
      label: "AI recommendation",
      tone: "text-primary",
      value: "AI_RECOMMENDATION",
    },
    {
      label: "Reviewer note",
      tone: "text-muted-foreground",
      value: "REVIEWER_COMMENT",
    },
    { label: "Field edited", tone: "text-warning", value: "FIELD_EDITED" },
    { label: "Approved", tone: "text-success", value: "LOAN_APPROVED" },
    { label: "Rejected", tone: "text-destructive", value: "LOAN_REJECTED" },
    {
      label: "Verified record created",
      tone: "text-success",
      value: "VERIFIED_RECORD_CREATED",
    },
    {
      label: "Record exported",
      tone: "text-muted-foreground",
      value: "RECORD_EXPORTED",
    },
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
  AI_RECOMMENDATION: "text-primary border-primary/30 bg-primary/10",
  EXCEPTION_CREATED: "text-destructive border-destructive/30 bg-destructive/10",
  FIELD_EDITED: "text-warning border-warning/30 bg-warning/10",
  FILE_UPLOADED: "text-muted-foreground border-border bg-muted/40",
  INGESTION_COMPLETED: "text-muted-foreground border-border bg-muted/40",
  LOAN_APPROVED: "text-success border-success/30 bg-success/10",
  LOAN_IMPORTED: "text-primary border-primary/30 bg-primary/10",
  LOAN_REJECTED: "text-destructive border-destructive/30 bg-destructive/10",
  RECORD_EXPORTED: "text-muted-foreground border-border bg-muted/40",
  REVIEWER_COMMENT: "text-muted-foreground border-border bg-muted/40",
  VALIDATION_RUN: "text-primary border-primary/30 bg-primary/10",
  VERIFIED_RECORD_CREATED: "text-success border-success/30 bg-success/10",
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
    <li className="relative flex gap-3.5 pb-6 last:pb-0">
      <span
        aria-hidden="true"
        className={cn(
          "z-10 flex size-8 shrink-0 items-center justify-center rounded-full border shadow-xs transition-transform",
          EVENT_TONES[entry.eventType] ??
            "border-border bg-card text-muted-foreground"
        )}
      >
        <i className={`${EVENT_ICONS[entry.eventType]} text-sm`} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex w-full flex-wrap items-baseline justify-between gap-x-2">
          <button
            className="flex items-center gap-2 text-left transition-colors hover:text-primary"
            disabled={!hasDetail}
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            <span className="font-semibold text-[13.5px] text-foreground">
              {entry.eventType.replaceAll("_", " ")}
            </span>
            {hasDetail ? (
              <i
                aria-hidden="true"
                className={cn(
                  "ri-arrow-right-s-line text-[13px] text-muted-foreground/60 transition-transform",
                  expanded && "rotate-90"
                )}
              />
            ) : null}
          </button>
          <span className="font-mono text-[11.5px] text-muted-foreground">
            {entry.actor?.name ?? "System"} ·{" "}
            {new Date(entry.createdAt).toLocaleString(undefined, {
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              month: "short",
            })}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
          {describeEntry(entry)}
        </p>
        {expanded && hasDetail ? (
          <div className="mt-2.5 rounded-xl border border-border bg-muted/40 p-3.5 shadow-2xs">
            {isEdit ? (
              <div className="space-y-1.5">
                <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
                  Field Modification
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                  <span className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-foreground">
                    {String(meta.field ?? "field")}
                  </span>
                  <span className="rounded-md border border-destructive/20 bg-destructive/10 px-2 py-0.5 font-mono text-destructive line-through">
                    {String(meta.oldValue ?? "—")}
                  </span>
                  <i
                    aria-hidden="true"
                    className="ri-arrow-right-line text-muted-foreground"
                  />
                  <span className="rounded-md border border-success/20 bg-success/10 px-2 py-0.5 font-mono font-semibold text-success">
                    {String(meta.newValue ?? "—")}
                  </span>
                </div>
              </div>
            ) : (
              <pre className="custom-scrollbar-hide overflow-x-auto font-mono text-[11px] text-muted-foreground leading-relaxed">
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
      <div className="relative">
        <i
          aria-hidden="true"
          className="ri-search-line absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60 text-sm"
        />
        <input
          className="h-9 w-full rounded-lg border border-input bg-card pr-8 pl-9 text-[13px] outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search verified loan ID…"
          type="search"
          value={query}
        />
        {query ? (
          <button
            aria-label="Clear query"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
            onClick={() => setQuery("")}
            type="button"
          >
            <i aria-hidden="true" className="ri-close-line" />
          </button>
        ) : null}
      </div>
      {query.trim().length > 0 ? (
        <ul className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {hits.length === 0 ? (
            <li className="px-3.5 py-3 text-[12.5px] text-muted-foreground">
              No verified loans match.
            </li>
          ) : (
            hits.map((record) => (
              <li key={record.id}>
                <button
                  className={cn(
                    "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[12.5px] transition-colors hover:bg-accent",
                    value === record.loanId &&
                      "bg-accent font-medium text-primary"
                  )}
                  onClick={() => {
                    onPick(record.loanId);
                    setQuery("");
                  }}
                  type="button"
                >
                  <span className="font-mono">
                    {record.loan.loanId ?? record.id}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {record.recordHash.slice(0, 10)}…
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

function TimelineEmptyState({
  icon,
  subtitle,
  title,
}: {
  icon: string;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-muted/40 shadow-xs">
        <i
          aria-hidden="true"
          className={`${icon} text-2xl text-muted-foreground/60`}
        />
      </div>
      <p className="font-semibold text-[15px]">{title}</p>
      <p className="max-w-xs text-[13px] text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function TimelineList({
  entries,
  eventFilter,
  loanId,
  onLoadMore,
  onOpenRecord,
  page,
  total,
  totalPages,
}: {
  entries: AuditLogEntry[];
  eventFilter: string;
  loanId: string;
  onLoadMore: () => void;
  onOpenRecord: () => void;
  page: number;
  total: number;
  totalPages: number;
}) {
  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-border border-b pb-4">
        <div>
          <p className="font-semibold text-[15px] tracking-tight">
            Event History
          </p>
          <p className="text-[12px] text-muted-foreground">
            {entries.length} of {total} total logged events
            {eventFilter ? " (filtered)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onOpenRecord} size="sm" variant="ghost">
            Open Dossier
            <i aria-hidden="true" className="ri-arrow-right-s-line ml-1" />
          </Button>
          <Button
            className="rounded-full"
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
            Export CSV
          </Button>
        </div>
      </header>
      <ol className="relative space-y-0 pl-1">
        {entries.map((entry, index) => (
          <div key={entry.id}>
            {index < entries.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute top-8 bottom-0 left-[18px] w-px bg-border/80"
              />
            ) : null}
            <TimelineEntry entry={entry} />
          </div>
        ))}
      </ol>
      {totalPages > page ? (
        <div className="mt-4 border-border border-t pt-4 text-center">
          <Button onClick={onLoadMore} size="sm" variant="outline">
            Load older events
          </Button>
        </div>
      ) : null}
    </>
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
    return [...filtered].reverse();
  }, [data, eventFilter]);

  const currentVerifiedRecord = verified?.data.find(
    (v) => v.loanId === loanId || v.id === loanId
  );
  const targetVerifiedId = currentVerifiedRecord?.id ?? loanId;
  const activeLoanDisplay =
    currentVerifiedRecord?.loan.loanId ?? (loanId || "None selected");

  const renderTimelineBody = () => {
    if (loanId === "") {
      return (
        <TimelineEmptyState
          icon="ri-history-line"
          subtitle="Pick a verified loan from the sidebar to inspect its complete, append-only event history."
          title="No loan selected"
        />
      );
    }
    if (isLoading) {
      return (
        <div className="space-y-3 py-4">
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton className="h-14 w-full rounded-xl" key={row} />
          ))}
        </div>
      );
    }
    if (entries.length === 0) {
      return (
        <TimelineEmptyState
          icon="ri-inbox-line"
          subtitle={
            eventFilter
              ? "No events of this type match for the selected loan."
              : "No audit events recorded for this loan."
          }
          title="No audit events found"
        />
      );
    }
    return (
      <TimelineList
        entries={entries}
        eventFilter={eventFilter}
        loanId={loanId}
        onLoadMore={() => setPage(page + 1)}
        onOpenRecord={() => navigate(`/consumer/loans/${targetVerifiedId}`)}
        page={page}
        total={data?.pagination.total ?? 0}
        totalPages={data?.pagination.totalPages ?? 1}
      />
    );
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-8">
      <PageHeader
        description="Append-only immutable event log tracking every ingestion, AI suggestion, reviewer decision, and export."
        eyebrow="Data Consumer"
        title="Audit Trail"
      />

      <KpiStrip>
        <KpiCard
          delta="Append-only log"
          deltaTone="neutral"
          icon="ri-history-line"
          label="Active audit target"
          loading={false}
          trend="neutral"
          trendLabel="target"
          trendValue={activeLoanDisplay}
          value={activeLoanDisplay}
        />
        <KpiCard
          icon="ri-list-check-2"
          label="Recorded audit events"
          loading={isLoading}
          trend="up"
          trendLabel="events"
          trendValue={loanId ? `${entries.length}` : "0"}
          value={loanId ? `${data?.pagination.total ?? entries.length}` : "—"}
        />
        <KpiCard
          delta="SHA-256 seal"
          deltaTone="positive"
          icon="ri-shield-check-line"
          label="Cryptographic status"
          loading={false}
          trend="up"
          trendLabel="sealed"
          trendValue="100%"
          value={loanId ? "Sealed" : "—"}
        />
        <KpiCard
          delta="CSV export ready"
          deltaTone="positive"
          icon="ri-file-download-line"
          label="Compliance format"
          loading={false}
          trend="up"
          trendLabel="audit"
          trendValue="Ready"
          value="Ready"
        />
      </KpiStrip>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-[13px] tracking-tight">
              Select a loan
            </h3>
            <LoanPicker onPick={setLoanId} value={loanId} />
            {loanId ? (
              <button
                className="mt-2.5 text-[12px] text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setLoanId("")}
                type="button"
              >
                Clear selection
              </button>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-[13px] tracking-tight">
              Filter by event type
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <button
                className={cn(
                  "rounded-full border px-3 py-1 font-medium text-[11.5px] transition-colors",
                  eventFilter === ""
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
                onClick={() => setEventFilter("")}
                type="button"
              >
                All Events
              </button>
              {EVENT_OPTIONS.map((option) => (
                <button
                  className={cn(
                    "rounded-full border px-3 py-1 font-medium text-[11.5px] transition-colors",
                    eventFilter === option.value
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
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
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-3 font-semibold text-[13px] tracking-tight">
                Recently verified
              </h3>
              <ul className="space-y-1.5">
                {verified.data.slice(0, 5).map((record) => (
                  <li key={record.id}>
                    <button
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2 text-left transition-all hover:border-border hover:bg-accent/40",
                        (loanId === record.loanId || loanId === record.id) &&
                          "border-primary/30 bg-primary/8 font-medium text-primary shadow-2xs"
                      )}
                      onClick={() => setLoanId(record.loanId)}
                      type="button"
                    >
                      <span className="font-mono text-[12.5px]">
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

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {renderTimelineBody()}
        </section>
      </div>
    </div>
  );
}
