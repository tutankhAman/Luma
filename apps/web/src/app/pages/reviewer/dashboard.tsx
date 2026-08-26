import type { AuditEventType, Severity } from "@repo/types";
import { useNavigate } from "react-router-dom";
import { SeverityBadge } from "@/components/ui/badges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { useDashboardSummary } from "@/hooks/use-exceptions";

function activityIcon(eventType: AuditEventType): string {
  if (eventType === "VERIFIED_RECORD_CREATED") {
    return "ri-shield-check-line text-green-500";
  }
  if (eventType === "EXCEPTION_CREATED") {
    return "ri-error-warning-line text-destructive";
  }
  return "ri-history-line text-muted-foreground";
}

export default function ReviewerDashboard() {
  const navigate = useNavigate();
  const { data: summary } = useDashboardSummary();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-heading font-semibold text-2xl">
          Reviewer Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
          Triage the exception queue and keep verified data flowing.
        </p>
      </div>

      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon="ri-error-warning-line"
              label="Open exceptions"
              value={summary.overview.openExceptions.toLocaleString()}
            />
            <StatCard
              icon="ri-shield-check-line"
              label="Quality score"
              value={`${summary.overview.qualityScore}%`}
            />
            <StatCard
              icon="ri-database-2-line"
              label="Verified loans"
              value={summary.overview.verifiedLoans.toLocaleString()}
            />
            <StatCard
              icon="ri-stack-line"
              label="Total loans"
              value={summary.overview.totalLoansImported.toLocaleString()}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>By severity</CardTitle>
                <CardDescription>Work critical items first</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(
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
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Latest audited events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.recentActivity.map((event) => (
                  <div
                    className="flex items-center justify-between gap-2 text-sm"
                    key={`${event.eventType}-${event.timestamp}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <i
                        aria-hidden="true"
                        className={activityIcon(event.eventType)}
                      />
                      <span className="truncate">
                        {event.eventType.replaceAll("_", " ").toLowerCase()}
                        {event.loanId ? ` · ${event.loanId}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-muted-foreground text-xs">
                      {new Date(event.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
