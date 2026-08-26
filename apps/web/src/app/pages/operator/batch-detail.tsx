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
import {
  ImportSummaryCard,
  ValidationSummaryCard,
} from "@/components/upload/validation-summary";
import { useUploadBatch, useUploadBatchSummary } from "@/hooks/use-uploads";

function FailedRowsTable({ rows }: { rows?: FailedRow[] }) {
  if (!rows?.length) {
    return (
      <CardContent>
        <p className="text-center text-muted-foreground text-sm">
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
              <TableCell className="max-w-md truncate text-muted-foreground text-xs">
                {row.rawData}
              </TableCell>
              <TableCell className="text-destructive text-xs">
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
  const { data: summary, isPending: summaryPending } =
    useUploadBatchSummary(id);
  const processing = batch?.status === "processing";

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

      {processing ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <i
              aria-hidden="true"
              className="ri-loader-4-line animate-spin text-3xl text-primary"
            />
            <p className="font-medium">Processing ingestion...</p>
            <p className="text-muted-foreground text-sm">
              This page auto-refreshes every 2 seconds until the stream
              completes.
            </p>
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
