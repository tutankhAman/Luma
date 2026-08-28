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
import { useDashboardSeries } from "@/hooks/use-dashboard-series";
import { useDashboardSummary, useExceptions } from "@/hooks/use-exceptions";
import { useUploads } from "@/hooks/use-uploads";
import { cn } from "@/lib/utils";

/* Spec §5.1 — Reviewer Dashboard (Module G + Module D batch summary). */

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  low: 3,
  medium: 2,
};

const SEVERITY_BAR_COLOR: Record<Severity, string> = {
  critical: "bg-destructive",
  high: "bg-destructive/85",
  low: "bg-success",
  medium: "bg-warning",
};

function ExceptionTrendChart() {
  const { data: summary } = useDashboardSummary();
  const { data: uploads } = useUploads();
  const { exceptionSeries } = useDashboardSeries({
    batches: uploads?.data,
    summary,
  });

  return (
    <section className="flex h-full min-h-[340px] flex-col rounded-xl bg-transparent py-5 pr-4">
      <header className="mb-3 flex shrink-0 items-start justify-between">
        <div>
          <h3 className="font-semibold text-xl tracking-tight">
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
      <div className="min-h-0 flex-1">
        <TrendChart
          className="aspect-auto h-[260px] w-full"
          data={exceptionSeries}
          dataKey="exceptions"
          height={260}
        />
      </div>
    </section>
  );
}

function IssuesBySeverity() {
  const { data: summary } = useDashboardSummary();
  const navigate = useNavigate();
  const rows = Object.entries(summary?.exceptionsBySeverity ?? {}) as [
    Severity,
    number,
  ][];
  const max = Math.max(1, ...rows.map(([, count]) => count));
  const sorted = rows.sort(
    (a, b) => SEVERITY_ORDER[a[0]] - SEVERITY_ORDER[b[0]]
  );
  const total = rows.reduce((sum, [, count]) => sum + count, 0);

  return (
    <section className="flex h-full min-h-[340px] flex-col rounded-2xl border border-border bg-card p-5">
      <header className="mb-3 shrink-0">
        <h3 className="font-semibold text-xl tracking-tight">
          Queue by severity
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Work critical and high priority items first
        </p>
      </header>
      {total === 0 ? (
        <div className="flex flex-1 items-center justify-center py-6">
          <p className="text-[13px] text-muted-foreground">
            No exceptions in queue.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ul className="space-y-3.5 pt-1">
            {sorted.map(([severity, count]) => (
              <li key={severity}>
                <button
                  className="group flex w-full items-center gap-3 text-left transition-opacity hover:opacity-80"
                  onClick={() =>
                    navigate(`/reviewer/exceptions?severity=${severity}`)
                  }
                  type="button"
                >
                  <div className="w-24 shrink-0">
                    <SeverityBadge severity={severity} />
                  </div>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        SEVERITY_BAR_COLOR[severity]
                      )}
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </span>
                  <span className="w-8 text-right font-medium text-[12.5px] tabular-nums">
                    {count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ExceptionQueueSection() {
  const navigate = useNavigate();
  const { data: critical, isLoading } = useExceptions({
    batchId: "",
    page: 1,
    search: "",
    severity: "critical",
    status: "open",
    type: "",
  });

  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between border-border border-b px-5 py-4">
        <div>
          <h3 className="font-semibold text-[14px] tracking-tight">
            Exception queue
          </h3>
          <p className="text-[12px] text-muted-foreground">
            Top open items ordered by severity
          </p>
        </div>
        <Button
          onClick={() => navigate("/reviewer/exceptions")}
          size="sm"
          variant="ghost"
        >
          View queue
          <i aria-hidden="true" className="ri-arrow-right-s-line" />
        </Button>
      </header>
      <ExceptionQueuePreview items={critical?.data} loading={isLoading} />
    </section>
  );
}

function RecentDecisionsSection() {
  const navigate = useNavigate();
  const { data: summary } = useDashboardSummary();

  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between border-border border-b px-5 py-4">
        <div>
          <h3 className="font-semibold text-[14px] tracking-tight">
            Recent decisions
          </h3>
          <p className="text-[12px] text-muted-foreground">
            Audited reviewer actions and updates
          </p>
        </div>
        <Button
          onClick={() => navigate("/consumer/audit")}
          size="sm"
          variant="ghost"
        >
          Audit trail
          <i aria-hidden="true" className="ri-arrow-right-s-line" />
        </Button>
      </header>
      <RecentDecisions events={summary?.recentActivity} />
    </section>
  );
}

export default function ReviewerDashboard() {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: allOpen } = useExceptions({
    batchId: "",
    page: 1,
    search: "",
    severity: "",
    status: "open",
    type: "",
  });
  const { data: uploads } = useUploads();

  const overview = summary?.overview;
  const openExceptions = overview?.openExceptions ?? 0;
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
          <Button
            className="rounded-full"
            onClick={() => navigate("/reviewer/exceptions")}
          >
            <i aria-hidden="true" className="ri-error-warning-line" />
            Open Exception Queue
          </Button>
        }
        description="Triage the exception queue and keep verified data flowing."
        title="Dashboard"
      />

      <KpiStrip>
        <KpiCard
          icon="ri-error-warning-line"
          inverse={true}
          label="Open exceptions"
          loading={isLoading}
          trend={openExceptions > 0 ? "down" : "up"}
          trendLabel="exceptions"
          trendValue={openExceptions > 0 ? `${openExceptions}` : "0"}
          value={overview ? openExceptions.toLocaleString() : "—"}
        />
        <KpiCard
          delta={highSeverity > 0 ? "Review immediately" : "None pending"}
          deltaTone={highSeverity > 0 ? "negative" : "positive"}
          icon="ri-alarm-warning-line"
          inverse={true}
          label="High-severity"
          loading={isLoading}
          trend={highSeverity > 0 ? "down" : "up"}
          trendLabel="critical"
          trendValue={highSeverity > 0 ? `${highSeverity}` : "0"}
          value={highSeverity.toLocaleString()}
        />
        <KpiCard
          icon="ri-user-search-line"
          label="Pending my review"
          loading={isLoading}
          trend="neutral"
          trendLabel="queue"
          trendValue={
            allOpen
              ? `${allOpen.pagination?.total ?? allOpen.data.length}`
              : "0"
          }
          value={
            allOpen
              ? (
                  allOpen.pagination?.total ?? allOpen.data.length
                ).toLocaleString()
              : "—"
          }
        />
        <KpiCard
          delta={reviewedToday > 0 ? "Last 24 hours" : "No decisions yet"}
          deltaTone={reviewedToday > 0 ? "positive" : "neutral"}
          icon="ri-checkbox-multiple-line"
          label="Reviewed today"
          loading={isLoading}
          trend="up"
          trendLabel="decisions"
          trendValue={reviewedToday > 0 ? `${reviewedToday}` : "0"}
          value={reviewedToday.toLocaleString()}
        />
      </KpiStrip>

      {latestBatch ? (
        <AiBatchSummary
          batchId={latestBatch.id}
          fileName={latestBatch.fileName}
        />
      ) : null}

      <div className="grid items-stretch gap-4 lg:grid-cols-5">
        <div className="flex flex-col lg:col-span-3">
          <ExceptionTrendChart />
        </div>
        <div className="flex flex-col lg:col-span-2">
          <IssuesBySeverity />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExceptionQueueSection />
        <RecentDecisionsSection />
      </div>
    </div>
  );
}
