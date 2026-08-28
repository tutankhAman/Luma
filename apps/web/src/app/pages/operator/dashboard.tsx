import type {
  ExceptionListItem,
  ExceptionType,
  UploadBatch,
} from "@repo/types";
import { useNavigate } from "react-router-dom";
import { KpiCard, KpiStrip } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { BatchStatusBadge, exceptionTypeLabel } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSeries } from "@/hooks/use-dashboard-series";
import { useDashboardSummary, useExceptions } from "@/hooks/use-exceptions";
import { useUploads } from "@/hooks/use-uploads";

/* Spec §4.1 — Operator Dashboard (Module G). */

const FILE_TYPE_LABELS: Record<string, string> = {
  document_manifest: "Document manifest",
  loan_tape: "Loan tape",
  servicer_update: "Servicer update",
};

function formatWhen(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

function RecentUploads() {
  const navigate = useNavigate();
  const { data, isLoading } = useUploads();
  const batches = (data?.data ?? []).slice(0, 5);

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
    if (batches.length === 0) {
      return (
        <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">
          No uploads yet — send your first loan tape.
        </p>
      );
    }
    return <UploadRows batches={batches} />;
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-border border-b px-5 py-4">
        <div>
          <h3 className="font-semibold text-[14px] tracking-tight">
            Recent uploads
          </h3>
          <p className="text-[12px] text-muted-foreground">
            Last 5 ingested files
          </p>
        </div>
        <Button
          onClick={() => navigate("/operator/imports")}
          size="sm"
          variant="ghost"
        >
          Import history
          <i aria-hidden="true" className="ri-arrow-right-s-line" />
        </Button>
      </header>
      {renderBody()}
    </section>
  );
}

function UploadRows({ batches }: { batches: UploadBatch[] }) {
  const navigate = useNavigate();

  if (batches.length === 0) {
    return null;
  }

  return (
    <ul className="divide-y divide-border">
      {batches.map((batch) => (
        <li key={batch.id}>
          <button
            className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-accent/50"
            onClick={() => navigate(`/operator/uploads/${batch.id}`)}
            type="button"
          >
            <i
              aria-hidden="true"
              className="ri-file-3-line text-base text-muted-foreground"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-[13px]">
                {batch.fileName}
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                {FILE_TYPE_LABELS[batch.fileType] ?? batch.fileType} ·{" "}
                {batch.recordCount.toLocaleString()} rows ·{" "}
                {formatWhen(batch.createdAt)}
              </span>
            </span>
            <BatchStatusBadge status={batch.status as never} />
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

function CorrectionsNeeded() {
  const navigate = useNavigate();
  const { data, isLoading } = useExceptions({
    batchId: "",
    page: 1,
    search: "",
    severity: "",
    status: "open",
    type: "",
  });
  const open = (data?.data ?? []).slice(0, 6);

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
    if (open.length === 0) {
      return (
        <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">
          Nothing needs correcting right now.
        </p>
      );
    }
    return (
      <ul className="divide-y divide-border">
        {open.map((item) => (
          <CorrectionRow item={item} key={item.id} />
        ))}
      </ul>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-border border-b px-5 py-4">
        <div>
          <h3 className="font-semibold text-[14px] tracking-tight">
            Corrections needed
          </h3>
          <p className="text-[12px] text-muted-foreground">
            Open exceptions awaiting operator action
          </p>
        </div>
        <Button
          onClick={() => navigate("/operator/loans")}
          size="sm"
          variant="ghost"
        >
          Loan records
          <i aria-hidden="true" className="ri-arrow-right-s-line" />
        </Button>
      </header>
      {renderBody()}
    </section>
  );
}

function CorrectionRow({ item }: { item: ExceptionListItem }) {
  const navigate = useNavigate();
  return (
    <li>
      <button
        className="group flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-accent/50"
        onClick={() => navigate("/operator/loans")}
        type="button"
      >
        <span className="w-[110px] shrink-0 truncate font-mono text-[12px]">
          {item.loan.loanId ?? item.loan.id}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">
          {exceptionTypeLabel(item.exceptionType)}
          {item.field ? ` · ${item.field}` : ""} — {item.message}
        </span>
        <i
          aria-hidden="true"
          className="ri-arrow-right-up-line text-muted-foreground/60"
        />
      </button>
    </li>
  );
}

function ValidationSummaryChart() {
  const { data: summary } = useDashboardSummary();
  const { data: uploads } = useUploads();
  const { exceptionSeries } = useDashboardSeries({
    batches: uploads?.data,
    summary,
  });

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-[14px] tracking-tight">
            Validation summary
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
        className="aspect-auto h-[190px] w-full"
        data={exceptionSeries}
        dataKey="exceptions"
      />
    </section>
  );
}

function IssuesByType() {
  const { data: summary } = useDashboardSummary();
  const byType = Object.entries(summary?.exceptionsByType ?? {}) as [
    ExceptionType,
    number,
  ][];
  const max = Math.max(1, ...byType.map(([, count]) => count));
  const top = byType
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4">
        <h3 className="font-semibold text-[14px] tracking-tight">
          Issues by type
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Where validation effort is going
        </p>
      </header>
      {top.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted-foreground">
          No issues recorded yet.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {top.slice(0, 6).map(([type, count]) => (
            <li className="flex items-center gap-3" key={type}>
              <span className="w-36 shrink-0 truncate text-[12.5px] text-muted-foreground">
                {exceptionTypeLabel(type)}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-[var(--chart-1)]"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </span>
              <span className="w-8 text-right font-medium text-[12.5px] tabular-nums">
                {count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: uploads } = useUploads();
  const overview = summary?.overview;
  const openExceptions = overview?.openExceptions ?? 0;
  const rowsFailed =
    (uploads?.data ?? []).reduce((acc, batch) => acc + batch.failedCount, 0) ||
    null;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-8">
      <PageHeader
        action={
          <Button
            className="rounded-full"
            onClick={() => navigate("/operator/upload")}
          >
            <i aria-hidden="true" className="ri-upload-cloud-2-line" />
            Upload New File
          </Button>
        }
        description="Ingest loan tapes and track validation health."
        title="Dashboard"
      />

      <KpiStrip>
        <KpiCard
          icon="ri-inbox-archive-line"
          label="Records ingested"
          loading={isLoading}
          trend="up"
          trendLabel="records"
          trendValue="12.4%"
          value={overview ? overview.totalLoansImported.toLocaleString() : "—"}
        />
        <KpiCard
          icon="ri-folder-upload-line"
          label="Files uploaded"
          loading={isLoading}
          trend="up"
          trendLabel="files"
          trendValue="2"
          value={overview ? overview.totalBatches.toLocaleString() : "—"}
        />
        <KpiCard
          icon="ri-file-damage-line"
          label="Rows failed import"
          loading={isLoading}
          trend={rowsFailed && rowsFailed > 0 ? "down" : "neutral"}
          trendLabel="rows"
          trendValue={rowsFailed && rowsFailed > 0 ? "3" : "0"}
          value={rowsFailed === null ? "—" : rowsFailed.toLocaleString()}
        />
        <KpiCard
          delta={openExceptions > 0 ? "Needs correction" : "All clear"}
          deltaTone={openExceptions > 0 ? "negative" : "positive"}
          icon="ri-error-warning-line"
          label="Corrections needed"
          loading={isLoading}
          trend={openExceptions > 0 ? "down" : "up"}
          trendLabel="exceptions"
          trendValue={openExceptions > 0 ? "4" : "0"}
          value={overview ? openExceptions.toLocaleString() : "—"}
        />
      </KpiStrip>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ValidationSummaryChart />
        </div>
        <div className="lg:col-span-2">
          <IssuesByType />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentUploads />
        <CorrectionsNeeded />
      </div>
    </div>
  );
}
