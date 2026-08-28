import type { Severity } from "@repo/types";
import { useNavigate } from "react-router-dom";
import { AiBatchSummary } from "@/components/dashboard/ai-batch-summary";
import { ExceptionQueuePreview } from "@/components/dashboard/exception-queue-preview";
import { KpiCard, KpiStrip } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { RecentDecisions } from "@/components/dashboard/recent-decisions";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { SeverityBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSeries } from "@/hooks/use-dashboard-series";
import { useDashboardSummary, useExceptions } from "@/hooks/use-exceptions";
import { useUploads } from "@/hooks/use-uploads";

/* Spec §5.1 — Reviewer Dashboard (Module G + Module D batch summary). */

function BySeverityPanel() {
  const { data: summary } = useDashboardSummary();
  const navigate = useNavigate();
  const rows = Object.entries(summary?.exceptionsBySeverity ?? {}) as [
    Severity,
    number,
  ][];

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-border border-b px-5 py-4">
        <div>
          <h3 className="font-semibold text-[14px] tracking-tight">
            By severity
          </h3>
          <p className="text-[12px] text-muted-foreground">
            Work critical items first
          </p>
        </div>
      </header>
      <ul className="divide-y divide-border">
        {rows.map(([severity, count]) => (
          <li key={severity}>
            <button
              className="flex w-full items-center justify-between px-5 py-2.5 transition-colors hover:bg-accent/50"
              onClick={() => navigate("/reviewer/exceptions")}
              type="button"
            >
              <SeverityBadge severity={severity} />
              <span className="font-medium text-[13px] tabular-nums">
                {count}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ReviewerDashboard() {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: critical, isLoading: queueLoading } = useExceptions({
    batchId: "",
    page: 1,
    search: "",
    severity: "critical",
    status: "open",
    type: "",
  });
  const { data: allOpen } = useExceptions({
    batchId: "",
    page: 1,
    search: "",
    severity: "",
    status: "open",
    type: "",
  });
  const { data: uploads } = useUploads();
  const { exceptionSeries } = useDashboardSeries({
    batches: uploads?.data,
    summary,
  });

  const overview = summary?.overview;
  const highSeverity =
    (summary?.exceptionsBySeverity?.critical ?? 0) +
    (summary?.exceptionsBySeverity?.high ?? 0);
  const latestBatch = uploads?.data?.[0];
  const reviewedToday = (summary?.recentActivity ?? []).filter((event) => {
    const isDecision = [
      "LOAN_APPROVED",
      "LOAN_REJECTED",
      "FIELD_EDITED",
    ].includes(event.eventType);
    return (
      isDecision &&
      Date.now() - new Date(event.timestamp).getTime() < 86_400_000
    );
  }).length;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-8">
      <PageHeader
        action={
          <Button onClick={() => navigate("/reviewer/exceptions")}>
            <i aria-hidden="true" className="ri-error-warning-line" />
            Open Exception Queue
          </Button>
        }
        description="Triage the exception queue and keep verified data flowing."
        eyebrow="Reviewer"
        title="Dashboard"
      />

      <KpiStrip>
        <KpiCard
          icon="ri-inbox-unarchive-line"
          label="Open exceptions"
          loading={isLoading}
          value={overview ? overview.openExceptions.toLocaleString() : "—"}
        />
        <KpiCard
          delta={highSeverity > 0 ? "Review immediately" : "None pending"}
          deltaTone={highSeverity > 0 ? "negative" : "positive"}
          icon="ri-alarm-warning-line"
          label="High-severity"
          loading={isLoading}
          value={highSeverity.toLocaleString()}
        />
        <KpiCard
          icon="ri-user-search-line"
          label="Pending my review"
          loading={isLoading}
          value={
            allOpen
              ? (
                  allOpen.pagination?.total ?? allOpen.data.length
                ).toLocaleString()
              : "—"
          }
        />
        <KpiCard
          delta={reviewedToday > 0 ? "Last 24 hours" : null}
          icon="ri-checkbox-multiple-line"
          label="Reviewed today"
          loading={isLoading}
          value={reviewedToday.toLocaleString()}
        />
      </KpiStrip>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <section className="rounded-xl border border-border bg-card">
            <header className="flex items-center justify-between border-border border-b px-5 py-4">
              <div>
                <h3 className="font-semibold text-[14px] tracking-tight">
                  Exception queue preview
                </h3>
                <p className="text-[12px] text-muted-foreground">
                  Top 5 critical, ordered by severity
                </p>
              </div>
              <Button
                onClick={() => navigate("/reviewer/exceptions")}
                size="sm"
                variant="ghost"
              >
                View all
                <i aria-hidden="true" className="ri-arrow-right-s-line" />
              </Button>
            </header>
            <div className="px-4 py-2">
              <ExceptionQueuePreview
                items={critical?.data}
                loading={queueLoading}
              />
            </div>
          </section>

          {latestBatch ? (
            <AiBatchSummary batchId={latestBatch.id} />
          ) : (
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <i
                  aria-hidden="true"
                  className="ri-sparkling-2-line text-primary"
                />
                <h3 className="font-semibold text-[14px] tracking-tight">
                  AI batch summary
                </h3>
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  Upload a batch first — the AI summarizer runs on the most
                  recent ingest.
                </p>
              )}
            </section>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <BySeverityPanel />
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-semibold text-[14px] tracking-tight">
              Recent decisions
            </h3>
            <RecentDecisions events={summary?.recentActivity} />
          </section>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <header className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-[14px] tracking-tight">
              Exception trend
            </h3>
            <p className="text-[12px] text-muted-foreground">
              Exception activity across the last 14 days
            </p>
          </div>
          <span className="flex items-center gap-1.5 font-medium text-[11px] text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-[var(--chart-1)]"
            />
            Exceptions
          </span>
        </header>
        <TrendChart
          className="aspect-auto h-[170px] w-full"
          data={exceptionSeries}
          dataKey="exceptions"
        />
      </section>
    </div>
  );
}
