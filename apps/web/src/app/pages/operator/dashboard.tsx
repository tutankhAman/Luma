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
    <div className="mx-auto max-w-[1040px] space-y-10 p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 font-semibold text-[28px] text-white tracking-tight">
            Operator Dashboard
          </h1>
          <p className="text-[#A1A1AA] text-[14px]">
            Ingest loan tapes and track validation health.
          </p>
        </div>
        <Select
          onValueChange={(value) => setRange(value ?? "All time")}
          value={range}
        >
          <SelectTrigger
            className="w-40 border-[#27272A] text-[#A1A1AA] hover:bg-[#27272A]/20"
            size="sm"
          >
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
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
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
            trendClassName="text-amber-400"
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

      <Card className="overflow-hidden rounded-[24px] border border-[#27272A] bg-[#18181B] shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.03),0px_4px_8px_-2px_rgba(0,0,0,0.02)]">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="font-medium text-lg text-white tracking-tight">
            Upload history
          </CardTitle>
          <CardDescription className="text-[#A1A1AA]">
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
