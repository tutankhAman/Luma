import type { VerifiedLoanListItem } from "@repo/types";
import { useNavigate } from "react-router-dom";
import { KpiCard, KpiStrip } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { QualityScoreGauge } from "@/components/dashboard/quality-gauge";
import { RecentDecisions } from "@/components/dashboard/recent-decisions";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { ValidationResultBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSeries } from "@/hooks/use-dashboard-series";
import { useDashboardSummary } from "@/hooks/use-exceptions";
import { useUploads } from "@/hooks/use-uploads";
import { useVerifiedLoans } from "@/hooks/use-verified-loans";

/* Spec §6.1 — Data Consumer Dashboard (Module G). */

function formatWhen(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

function QuickLink({
  href,
  icon,
  label,
  sub,
}: {
  href: string;
  icon: string;
  label: string;
  sub: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      className="group flex flex-1 items-center gap-3.5 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-accent/30"
      onClick={() => navigate(href)}
      type="button"
    >
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-xs"
      >
        <i className={`${icon} text-base`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-[13px]">{label}</span>
        <span className="block truncate text-[11.5px] text-muted-foreground">
          {sub}
        </span>
      </span>
      <i
        aria-hidden="true"
        className="ri-arrow-right-s-line text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
      />
    </button>
  );
}

function VerificationVolumeChart() {
  const { data: summary } = useDashboardSummary();
  const { data: uploads } = useUploads();
  const { volumeSeries } = useDashboardSeries({
    batches: uploads?.data,
    summary,
  });

  return (
    <section className="flex h-full min-h-[340px] flex-col rounded-xl bg-transparent py-5 pr-4">
      <header className="mb-3 flex shrink-0 items-start justify-between">
        <div>
          <h3 className="font-semibold text-xl tracking-tight">
            Verification volume
          </h3>
          <p className="text-[12px] text-muted-foreground">
            Ingestion and verification activity across the last 14 days
          </p>
        </div>
        <span className="flex items-center gap-1.5 font-medium text-[11px] text-muted-foreground">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-[var(--chart-1)]"
          />
          Records
        </span>
      </header>
      <div className="min-h-0 flex-1">
        <TrendChart
          className="aspect-auto h-[260px] w-full"
          data={volumeSeries}
          dataKey="ingested"
          height={260}
        />
      </div>
    </section>
  );
}

function QualityHealthCard({
  qualityScore,
  totalVerified,
}: {
  qualityScore: number;
  totalVerified: number;
}) {
  return (
    <section className="flex h-full min-h-[340px] flex-col rounded-2xl border border-border bg-card p-5">
      <header className="mb-3 shrink-0">
        <h3 className="font-semibold text-xl tracking-tight">
          Quality & lineage
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Verification rate and cryptographic integrity
        </p>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center py-2">
        <QualityScoreGauge score={qualityScore} size={150} />
      </div>
      <div className="grid grid-cols-2 gap-2 border-border/80 border-t pt-3.5 text-center">
        <div className="rounded-lg bg-muted/40 p-2">
          <p className="text-[11px] text-muted-foreground">Passed validation</p>
          <p className="font-semibold text-[14px] text-foreground tabular-nums">
            {totalVerified.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <p className="text-[11px] text-muted-foreground">SHA-256 sealed</p>
          <p className="font-semibold text-[14px] text-success tabular-nums">
            100%
          </p>
        </div>
      </div>
    </section>
  );
}

function RecentVerifiedRecords({
  items,
  loading,
}: {
  items?: VerifiedLoanListItem[];
  loading?: boolean;
}) {
  const navigate = useNavigate();
  const records = (items ?? []).slice(0, 5);

  function renderBody() {
    if (loading) {
      return (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((row) => (
            <Skeleton className="h-9 w-full" key={row} />
          ))}
        </div>
      );
    }
    if (records.length === 0) {
      return (
        <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">
          No verified records yet.
        </p>
      );
    }
    return (
      <ul className="divide-y divide-border">
        {records.map((item) => (
          <li key={item.id}>
            <button
              className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-accent/50"
              onClick={() => navigate(`/consumer/loans/${item.id}`)}
              type="button"
            >
              <i
                aria-hidden="true"
                className="ri-shield-check-line text-base text-success"
              />
              <span className="w-[110px] shrink-0 truncate font-mono text-[12px]">
                {item.loan.loanId ?? item.loanId}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">
                {item.loan.borrowerId
                  ? `Borrower ${item.loan.borrowerId} · `
                  : ""}
                {formatWhen(item.verifiedAt)}
              </span>
              <ValidationResultBadge result={item.validationResult} />
              <i
                aria-hidden="true"
                className="ri-arrow-right-s-line text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
              />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between border-border border-b px-5 py-4">
        <div>
          <h3 className="font-semibold text-[14px] tracking-tight">
            Recent verified records
          </h3>
          <p className="text-[12px] text-muted-foreground">
            Latest loans sealed with cryptographic hashes
          </p>
        </div>
        <Button
          onClick={() => navigate("/consumer/verified")}
          size="sm"
          variant="ghost"
        >
          Verified records
          <i aria-hidden="true" className="ri-arrow-right-s-line" />
        </Button>
      </header>
      {renderBody()}
    </section>
  );
}

function RecentAuditActivity() {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useDashboardSummary();
  const events = (summary?.recentActivity ?? []).slice(0, 5);

  function renderBody() {
    if (isLoading) {
      return (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((row) => (
            <Skeleton className="h-9 w-full" key={row} />
          ))}
        </div>
      );
    }
    if (events.length === 0) {
      return (
        <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">
          No recent activity recorded yet.
        </p>
      );
    }
    return <RecentDecisions decisionsOnly={false} events={events} />;
  }

  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between border-border border-b px-5 py-4">
        <div>
          <h3 className="font-semibold text-[14px] tracking-tight">
            Audit & lineage activity
          </h3>
          <p className="text-[12px] text-muted-foreground">
            Latest verification and downstream actions
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
      {renderBody()}
    </section>
  );
}

function formatQualityScore(score: number): string {
  if (score === 0) {
    return "0%";
  }
  if (score < 1) {
    return `${score.toFixed(2)}%`;
  }
  if (score < 10) {
    return `${score.toFixed(1)}%`;
  }
  return `${Math.round(score)}%`;
}

function getQualityDelta(score: number): string {
  if (score >= 95) {
    return "High confidence";
  }
  if (score >= 80) {
    return "Good quality";
  }
  return "Review pending";
}

export default function ConsumerDashboard() {
  const navigate = useNavigate();
  const { data: verified, isLoading } = useVerifiedLoans(1, "");
  const { data: summary } = useDashboardSummary();

  const totalVerified = verified?.pagination.total ?? 0;
  const qualityScore =
    verified?.qualityScore ?? summary?.overview.qualityScore ?? 0;
  const exported = (summary?.recentActivity ?? []).filter(
    (event) => event.eventType === "RECORD_EXPORTED"
  ).length;
  const lastExport = (summary?.recentActivity ?? []).find(
    (event) => event.eventType === "RECORD_EXPORTED"
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-8">
      <PageHeader
        action={
          <Button
            className="rounded-full"
            onClick={() => navigate("/consumer/export")}
          >
            <i aria-hidden="true" className="ri-download-2-line" />
            Export Records
          </Button>
        }
        description="Trusted loan data with full lineage and tamper-evident hashes."
        title="Dashboard"
      />

      <KpiStrip>
        <KpiCard
          icon="ri-shield-check-line"
          label="Total verified records"
          loading={isLoading}
          trend="up"
          trendLabel="records"
          trendValue="18.5%"
          value={verified ? totalVerified.toLocaleString() : "—"}
        />
        <KpiCard
          delta={getQualityDelta(qualityScore)}
          deltaTone={qualityScore >= 90 ? "positive" : "neutral"}
          icon="ri-sparkling-line"
          label="Data quality score"
          loading={isLoading}
          trend={qualityScore >= 90 ? "up" : "neutral"}
          trendLabel="score"
          trendValue={formatQualityScore(qualityScore)}
          value={formatQualityScore(qualityScore)}
        />
        <KpiCard
          icon="ri-download-cloud-2-line"
          label="Records exported"
          loading={isLoading}
          trend="up"
          trendLabel="exports"
          trendValue="24%"
          value={exported ? `${exported}+` : "0"}
        />
        <KpiCard
          delta={
            lastExport
              ? `Sealed on ${new Date(lastExport.timestamp).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}`
              : "No exports yet"
          }
          deltaTone="neutral"
          icon="ri-calendar-event-line"
          label="Last export date"
          loading={isLoading}
          value={
            lastExport
              ? new Date(lastExport.timestamp).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "short",
                })
              : "—"
          }
        />
      </KpiStrip>

      <div className="grid items-stretch gap-4 lg:grid-cols-5">
        <div className="flex flex-col lg:col-span-3">
          <VerificationVolumeChart />
        </div>
        <div className="flex flex-col lg:col-span-2">
          <QualityHealthCard
            qualityScore={qualityScore}
            totalVerified={totalVerified}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentVerifiedRecords items={verified?.data} loading={isLoading} />
        <RecentAuditActivity />
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <QuickLink
          href="/consumer/verified"
          icon="ri-shield-check-line"
          label="Verified Records"
          sub="Browse every verified loan record and tamper-evident SHA-256 seal"
        />
        <QuickLink
          href="/consumer/audit"
          icon="ri-history-line"
          label="Audit Trail"
          sub="Full chronological event history and loan mutation timeline"
        />
        <QuickLink
          href="/consumer/export"
          icon="ri-share-box-line"
          label="Export & API"
          sub="Download datasets as CSV/JSON or explore REST endpoints"
        />
      </div>
    </div>
  );
}
