import type { UploadBatch } from "@repo/types";
import { useNavigate } from "react-router-dom";
import { BatchStatusBadge } from "@/components/ui/badges";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const FILE_TYPE_ICONS: Record<string, string> = {
  document_manifest: "ri-folder-document-line",
  loan_tape: "ri-file-excel-2-line",
  servicer_update: "ri-refresh-line",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

export function BatchTable({
  batches,
  isLoading,
}: {
  batches?: UploadBatch[];
  isLoading?: boolean;
}) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-2 p-1">
        {[0, 1, 2].map((row) => (
          <Skeleton className="h-10 w-full" key={row} />
        ))}
      </div>
    );
  }

  if (!batches?.length) {
    return (
      <p className="p-6 text-center text-muted-foreground text-sm">
        No uploads yet — ingest your first loan tape above.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Records</TableHead>
          <TableHead className="text-right">Failed</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Uploaded At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map((batch) => (
          <TableRow
            className="cursor-pointer"
            key={batch.id}
            onClick={() => navigate(`/operator/uploads/${batch.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                navigate(`/operator/uploads/${batch.id}`);
              }
            }}
            tabIndex={0}
          >
            <TableCell className="font-medium">
              <i
                aria-hidden="true"
                className={`${FILE_TYPE_ICONS[batch.fileType] ?? "ri-file-line"} mr-2 text-muted-foreground`}
              />
              {batch.fileName}
            </TableCell>
            <TableCell className="capitalize">
              {batch.fileType.replace(/_/g, " ")}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {batch.recordCount.toLocaleString()}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {batch.failedCount > 0 ? (
                <span className="text-destructive">{batch.failedCount}</span>
              ) : (
                "0"
              )}
            </TableCell>
            <TableCell>
              <BatchStatusBadge status={batch.status} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDate(batch.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
