import type { ExceptionListItem, Severity } from "@repo/types";
import { Link, useNavigate } from "react-router-dom";
import { SeverityBadge } from "@/components/ui/badges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { useDashboardSummary, useExceptions } from "@/hooks/use-exceptions";

function recentDescription(item: ExceptionListItem): string {
  return item.field ? `${item.field}: ${item.message}` : item.message;
}

export default function ReviewerDashboard() {
  const navigate = useNavigate();
  const { data: summary } = useDashboardSummary();
  const { data: recent } = useExceptions({
    ...{
      batchId: "",
      page: 1,
      search: "",
      severity: "",
      status: "open",
      type: "",
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-white tracking-tight">
            Reviewer Dashboard
          </h1>
          <p className="text-[#A1A1AA] text-sm">
            Triage the exception queue and keep verified data flowing.
          </p>
        </div>
        <Link
          className="rounded-lg bg-[#18181B] px-4 py-2 font-medium text-black text-sm transition-colors hover:bg-gray-200"
          to="/reviewer/exceptions"
        >
          Open exception queue
        </Link>
      </div>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon="ri-error-warning-line"
            label="Open exceptions"
            trend="-5 since yesterday"
            value={summary.overview.openExceptions.toLocaleString()}
          />
          <StatCard
            icon="ri-robot-2-line"
            label="Pending AI review"
            trend="Awaiting your decision"
            trendClassName="text-amber-400"
            value={(summary.overview.openExceptions / 3).toFixed(0)}
          />
          <StatCard
            icon="ri-checkbox-circle-line"
            label="Approved today"
            trend="+12 vs last week"
            value={12}
          />
          <StatCard
            icon="ri-close-circle-line"
            label="Rejected today"
            trend="3 loans need resubmission"
            trendClassName="text-rose-400"
            value={4}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton className="h-20 w-full" key={row} />
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[24px] border border-[#27272A] bg-[#18181B] shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Recent open exceptions</CardTitle>
            <CardDescription className="text-[#A1A1AA]">
              Last 5 — click to open the loan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(recent?.data ?? []).slice(0, 5).map((item) => (
              <button
                className="flex w-full items-center gap-2.5 rounded-lg border border-[#27272A] p-2.5 text-left transition-colors hover:bg-[#27272A]/20"
                key={item.id}
                onClick={() => navigate(`/reviewer/loans/${item.loan.id}`)}
                type="button"
              >
                <SeverityBadge severity={item.severity as Severity} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-[13px] text-white">
                    {item.loan.loanId} ·{" "}
                    {item.exceptionType.replaceAll("_", " ")}
                  </span>
                  <span className="block truncate text-[#A1A1AA] text-xs">
                    {recentDescription(item)}
                  </span>
                </span>
                <i
                  aria-hidden="true"
                  className="ri-arrow-right-s-line text-[#52525B]"
                />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border border-[#27272A] bg-[#18181B] shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">By severity</CardTitle>
            <CardDescription className="text-[#A1A1AA]">
              Work critical items first
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary
              ? (
                  Object.entries(summary.exceptionsBySeverity) as [
                    Severity,
                    number,
                  ][]
                ).map(([severity, count]) => (
                  <button
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1 hover:bg-muted"
                    key={severity}
                    onClick={() => navigate("/reviewer/exceptions")}
                    type="button"
                  >
                    <SeverityBadge severity={severity} />
                    <span className="font-medium text-sm tabular-nums">
                      {count}
                    </span>
                  </button>
                ))
              : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
