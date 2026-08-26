import type { FailedRow } from "@repo/types";
import { useParams } from "react-router-dom";
import { BatchStatusBadge } from "@/components/ui/badges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PipelineTracker } from "@/components/upload/pipeline-stepper";
import {
  ImportSummaryCard,
  ValidationSummaryCard,
} from "@/components/upload/validation-summary";
import { useUploadBatch, useUploadBatchSummary } from "@/hooks/use-uploads";

function FailedRowsTable({ rows }: { rows?: FailedRow[] }) {
  if (!rows?.length) {
    return (
      <CardContent>
        <p className="text-center text-[#A1A1AA] text-sm">
          All rows imported cleanly.
        </p>
      </CardContent>
    );
  }
  return (
    <CardContent className="px-0 pb-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Row</TableHead>
            <TableHead>Raw data</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.rowNumber}>
              <TableCell className="pl-4 tabular-nums">
                {row.rowNumber}
              </TableCell>
              <TableCell className="max-w-md truncate text-[#A1A1AA] text-xs">
                {row.rawData}
              </TableCell>
              <TableCell className="text-rose-400 text-xs">
                {row.reason}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  );
}

export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const id = batchId ?? "";
  const { data: batch, isLoading } = useUploadBatch(id);
  const processing = batch?.status === "processing";
  const { data: summary, isPending: summaryPending } = useUploadBatchSummary(
    id,
    processing
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <h1 className="font-heading font-semibold text-2xl">
          {batch?.fileName ?? "Batch"}
        </h1>
        {batch ? <BatchStatusBadge status={batch.status} /> : null}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : null}

      {batch ? (
        <PipelineTracker
          failedCount={batch.failedCount}
          metadata={batch.metadata}
          processedCount={batch.processedCount}
          recordCount={batch.recordCount}
          status={batch.status}
        />
      ) : null}

      {batch?.status === "failed" ? (
        <Card className="rounded-[24px] border border-rose-500/30 bg-rose-500/10 shadow-none">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="flex items-center gap-2 font-semibold text-rose-400 text-sm">
              <i aria-hidden="true" className="ri-error-warning-line text-lg" />
              Ingestion Failed
            </CardTitle>
            <CardDescription className="mt-1 text-[13px] text-rose-200/90">
              The CSV stream stopped before completing. Fix the source file and
              re-upload — partially imported rows are kept and a retry is
              idempotent.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <pre className="custom-scrollbar-hide max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-rose-500/20 bg-black/50 p-3 font-mono text-[11px] text-rose-300/80">
              {String(
                (batch.metadata as Record<string, unknown> | null)?.error ??
                  `Unknown error — check the API logs for batch ${batch.id}`
              )}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      {processing || isLoading ? null : (
        <ImportSummaryCard
          failedCount={batch?.failedCount ?? 0}
          processedCount={batch?.processedCount}
          recordCount={batch?.recordCount ?? 0}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Failed rows</CardTitle>
          <CardDescription>
            Rows that could not be normalized (capped at first 1,000).
          </CardDescription>
        </CardHeader>
        <FailedRowsTable rows={batch?.failedRows} />
      </Card>

      {processing ? <ValidationSummaryCard summary={null} /> : null}

      {!processing && summaryPending ? (
        <Skeleton className="h-64 w-full" />
      ) : null}

      {processing || summaryPending ? null : (
        <ValidationSummaryCard summary={summary ?? null} />
      )}
    </div>
  );
}
