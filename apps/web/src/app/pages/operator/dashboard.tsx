import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { BatchTable } from "@/components/upload/batch-table";
import { CsvDropzone } from "@/components/upload/csv-dropzone";
import { useDashboardSummary } from "@/hooks/use-exceptions";
import { useUploads } from "@/hooks/use-uploads";

export default function OperatorDashboard() {
  const { data, isLoading } = useUploads();
  const { data: summary } = useDashboardSummary();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-heading font-semibold text-2xl">
          Operator Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
          Ingest loan tapes and track import + validation health.
        </p>
      </div>

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon="ri-stack-line"
            label="Loans imported"
            value={summary.overview.totalLoansImported.toLocaleString()}
          />
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
        </div>
      ) : null}

      <CsvDropzone />

      <Card>
        <CardHeader>
          <CardTitle>Upload history</CardTitle>
          <CardDescription>
            Click a batch to view import results and validation summary.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <BatchTable batches={data?.data} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
