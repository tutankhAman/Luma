import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { BatchTable } from "@/components/upload/batch-table";
import { CsvDropzone } from "@/components/upload/csv-dropzone";
import { useDashboardSummary } from "@/hooks/use-exceptions";
import { useUploads } from "@/hooks/use-uploads";

const RANGES = ["Last 7 days", "Last 30 days", "All time"];

export default function OperatorDashboard() {
  const { data, isLoading } = useUploads();
  const { data: summary } = useDashboardSummary();
  const [range, setRange] = useState("All time");

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-semibold text-2xl text-slate-900 tracking-tight">
            Operator Dashboard
          </h1>
          <p className="text-slate-500 text-sm">
            Ingest loan tapes and track import + validation health.
          </p>
        </div>
        <Select
          onValueChange={(value) => setRange(value ?? "All time")}
          value={range}
        >
          <SelectTrigger className="w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon="ri-stack-line"
            label="Loans imported"
            trend="+12% this week"
            value={summary.overview.totalLoansImported.toLocaleString()}
          />
          <StatCard
            icon="ri-alert-line"
            label="Open exceptions"
            trend="-5 since yesterday"
            value={summary.overview.openExceptions.toLocaleString()}
          />
          <StatCard
            icon="ri-shield-check-line"
            label="Quality score"
            trend="Needs attention"
            trendClassName="text-amber-600"
            value={`${summary.overview.qualityScore}%`}
          />
          <StatCard
            icon="ri-database-2-line"
            label="Verified loans"
            trend="+8% this week"
            value={summary.overview.verifiedLoans.toLocaleString()}
          />
        </div>
      ) : null}

      <CsvDropzone />

      <Card className="overflow-hidden rounded-2xl border-slate-100 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
        <CardHeader>
          <CardTitle className="text-slate-900">Upload history</CardTitle>
          <CardDescription className="text-slate-500">
            Click a batch to view import results and validation summary.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <BatchTable batches={data?.data} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
