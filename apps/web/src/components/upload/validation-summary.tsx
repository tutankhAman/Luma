import type { ExceptionType, Severity } from "@repo/types";
import { SeverityBadge } from "@/components/ui/badges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";

export function ImportSummaryCard({
  recordCount,
  processedCount,
  failedCount,
  processing,
}: {
  recordCount: number;
  processedCount?: number;
  failedCount: number;
  processing?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard
        hint={processing ? "processing..." : undefined}
        icon="ri-stack-line"
        label="Total rows"
        value={recordCount.toLocaleString()}
      />
      <StatCard
        hint={
          processedCount !== undefined && processedCount < recordCount
            ? `${Math.round((processedCount / Math.max(recordCount, 1)) * 100)}% complete`
            : undefined
        }
        icon="ri-check-double-line"
        label="Imported"
        value={(processedCount ?? recordCount - failedCount).toLocaleString()}
      />
      <StatCard
        icon="ri-close-circle-line"
        label="Failed rows"
        value={failedCount.toLocaleString()}
      />
    </div>
  );
}

export function ValidationSummaryCard({
  summary,
}: {
  summary: {
    exceptionsBySeverity: Record<Severity, number>;
    exceptionsByType: Record<ExceptionType, number>;
    failedValidation: number;
    passedValidation: number;
    totalImported: number;
  } | null;
}) {
  if (!summary) {
    return null;
  }

  const typeEntries = Object.entries(summary.exceptionsByType).sort(
    (a, b) => b[1] - a[1]
  );
  const maxType = typeEntries[0]?.[1] ?? 0;

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="grid gap-3 lg:col-span-3 lg:grid-cols-3">
        <StatCard
          icon="ri-checkbox-circle-line"
          label="Passed validation"
          value={summary.passedValidation.toLocaleString()}
        />
        <StatCard
          icon="ri-error-warning-line"
          label="Failed validation"
          value={summary.failedValidation.toLocaleString()}
        />
        <StatCard
          hint={`${Math.round((summary.passedValidation / Math.max(summary.totalImported, 1)) * 100)}% clean rate`}
          icon="ri-database-2-line"
          label="Total imported"
          value={summary.totalImported.toLocaleString()}
        />
      </div>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Exceptions by type</CardTitle>
          <CardDescription>Validation failures grouped by rule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {typeEntries.map(([type, count]) => (
            <div className="space-y-1" key={type}>
              <div className="flex justify-between text-sm">
                <span className="capitalize">{type.replaceAll("_", " ")}</span>
                <span className="text-[#A1A1AA] tabular-nums">{count}</span>
              </div>
              <Progress value={maxType > 0 ? (count / maxType) * 100 : 0} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By severity</CardTitle>
          <CardDescription>Critical items need attention first</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            Object.entries(summary.exceptionsBySeverity) as [Severity, number][]
          ).map(([severity, count]) => (
            <div className="flex items-center justify-between" key={severity}>
              <SeverityBadge severity={severity} />
              <span className="font-medium text-sm tabular-nums">
                {count.toLocaleString()}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
