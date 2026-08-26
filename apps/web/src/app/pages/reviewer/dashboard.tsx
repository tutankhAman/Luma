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

const EVENT_ICONS: Record<string, string> = {
  AI_RECOMMENDATION: "ri-robot-2-line",
  EXCEPTION_CREATED: "ri-error-warning-line",
  FIELD_EDITED: "ri-edit-line",
  LOAN_APPROVED: "ri-checkbox-circle-line",
  LOAN_IMPORTED: "ri-download-line",
  LOAN_REJECTED: "ri-close-circle-line",
  RECORD_EXPORTED: "ri-share-box-line",
  REVIEWER_COMMENT: "ri-chat-3-line",
  VERIFIED_RECORD_CREATED: "ri-shield-check-line",
};

function recentDescription(item: ExceptionListItem): string {
  return item.field ? `${item.field}: ${item.message}` : item.message;
}

export default function ReviewerDashboard() {
  const navigate = useNavigate();
  const { data: summary } = useDashboardSummary();
  const { data: recent } = useExceptions({
    batchId: "",
    page: 1,
    search: "",
    severity: "critical",
    status: "open",
    type: "",
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="mb-2 font-semibold text-[28px] text-white tracking-tight">
            Reviewer Dashboard
          </h1>
          <p className="text-[#A1A1AA] text-sm">
            Triage the exception queue and keep verified data flowing.
          </p>
        </div>
        <Link
          className="rounded-lg bg-white px-4 py-2 font-medium text-black text-sm transition-colors hover:bg-gray-200"
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
            value={summary.overview.openExceptions.toLocaleString()}
          />
          <StatCard
            icon="ri-checkbox-circle-line"
            label="Verified loans"
            trend={`${summary.overview.verifiedLoans} total`}
            trendClassName="text-emerald-400"
            value={summary.overview.verifiedLoans.toLocaleString()}
          />
          <StatCard
            icon="ri-database-2-line"
            label="Total loans"
            trend={`${summary.overview.totalLoansImported.toLocaleString()} imported`}
            value={summary.overview.totalLoansImported.toLocaleString()}
          />
          <StatCard
            icon="ri-percent-line"
            label="Quality score"
            trend={
              summary.overview.qualityScore >= 80
                ? "Healthy"
                : "Needs attention"
            }
            trendClassName={
              summary.overview.qualityScore >= 80
                ? "text-emerald-400"
                : "text-amber-400"
            }
            value={`${summary.overview.qualityScore.toFixed(1)}%`}
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
            <CardTitle className="text-white">
              Critical open exceptions
            </CardTitle>
            <CardDescription className="text-[#A1A1AA]">
              Top 5 critical — click to open the loan
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
            {recent?.data.length === 0 ? (
              <p className="py-4 text-center text-[#52525B] text-xs">
                No critical exceptions — nice work.
              </p>
            ) : null}
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
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1 hover:bg-[#27272A]/20"
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

      {summary?.recentActivity && summary.recentActivity.length > 0 ? (
        <Card className="rounded-[24px] border border-[#27272A] bg-[#18181B] shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Recent activity</CardTitle>
            <CardDescription className="text-[#A1A1AA]">
              Latest audit events across all loans
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {summary.recentActivity.slice(0, 10).map((event) => (
              <div
                className="flex items-center gap-3 rounded-lg px-2 py-1.5"
                key={`${event.eventType}-${event.timestamp}-${event.loanId ?? "none"}`}
              >
                <i
                  aria-hidden="true"
                  className={
                    EVENT_ICONS[event.eventType] ?? "ri-information-line"
                  }
                />
                <span className="min-w-0 flex-1 text-[13px] text-white">
                  <span className="text-[#A1A1AA]">
                    {event.eventType.replaceAll("_", " ")}
                  </span>
                  {event.loanId ? (
                    <span className="ml-1 font-mono text-[#8B5CF6] text-xs">
                      {event.loanId}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-[#52525B] text-[11px]">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
