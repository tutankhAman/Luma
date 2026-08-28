import { useNavigate } from "react-router-dom";
import { KpiCard, KpiStrip } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { QualityScoreGauge } from "@/components/dashboard/quality-gauge";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { Button } from "@/components/ui/button";
import { useDashboardSeries } from "@/hooks/use-dashboard-series";
import { useDashboardSummary } from "@/hooks/use-exceptions";
import { useUploads } from "@/hooks/use-uploads";
import { useVerifiedLoans } from "@/hooks/use-verified-loans";

/* Spec §6.1 — Data Consumer Dashboard (Module G). */

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
      className="group flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-all hover:border-primary/40 hover:shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.12)]"
      onClick={() => navigate(href)}
      type="button"
    >
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"
      >
        <i className={`${icon} text-[15px]`} />
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

export default function ConsumerDashboard() {
  const navigate = useNavigate();
  const { data: verified, isLoading } = useVerifiedLoans(1, "");
  const { data: summary } = useDashboardSummary();
  const { data: uploads } = useUploads();
  const { volumeSeries } = useDashboardSeries({
    batches: uploads?.data,
    summary,
  });

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
          <Button onClick={() => navigate("/consumer/export")}>
            <i aria-hidden="true" className="ri-download-2-line" />
            Export Records
          </Button>
        }
        description="Trusted loan data with full lineage and tamper-evident hashes."
        eyebrow="Data Consumer"
        title="Dashboard"
      />

      <KpiStrip>
        <KpiCard
          icon="ri-shield-check-line"
          label="Total verified records"
          loading={isLoading}
          value={verified ? totalVerified.toLocaleString() : "—"}
        />
        <KpiCard
          delta={
            lastExport
              ? `Last export ${new Date(lastExport.timestamp).toLocaleDateString()}`
              : "No exports yet"
          }
          icon="ri-download-cloud-2-line"
          label="Records exported"
          loading={isLoading}
          value={exported ? `${exported}+` : "0"}
        />
        <KpiCard
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
        <div className="flex items-center justify-center py-3 [&>*]:my-auto">
          <QualityScoreGauge className="" score={qualityScore} size={124} />
        </div>
      </KpiStrip>

      <section className="rounded-xl border border-border bg-card p-5">
        <header className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-[14px] tracking-tight">
              Verification history
            </h3>
            <p className="text-[12px] text-muted-foreground">
              Ingestion and verification activity, last 14 days
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
        <TrendChart
          className="aspect-auto h-[190px] w-full"
          data={volumeSeries}
          dataKey="ingested"
        />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <QuickLink
          href="/consumer/verified"
          icon="ri-shield-check-line"
          label="Verified Records"
          sub="Browse every verified loan record"
        />
        <QuickLink
          href="/consumer/audit"
          icon="ri-history-line"
          label="Audit Trail"
          sub="Full chronological event history"
        />
        <QuickLink
          href="/consumer/export"
          icon="ri-share-box-line"
          label="Export"
          sub="Download verified records as CSV or JSON"
        />
      </div>
    </div>
  );
}
