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
        <TableRow className="border-slate-100 border-b bg-slate-50/80 hover:bg-slate-50/80">
          <TableHead className="pl-4 text-slate-500 text-xs uppercase tracking-wider">
            File Name
          </TableHead>
          <TableHead className="text-slate-500 text-xs uppercase tracking-wider">
            Type
          </TableHead>
          <TableHead className="text-right text-slate-500 text-xs uppercase tracking-wider">
            Records
          </TableHead>
          <TableHead className="text-right text-slate-500 text-xs uppercase tracking-wider">
            Failed
          </TableHead>
          <TableHead className="text-slate-500 text-xs uppercase tracking-wider">
            Status
          </TableHead>
          <TableHead className="text-slate-500 text-xs uppercase tracking-wider">
            Uploaded At
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map((batch) => (
          <TableRow
            className="cursor-pointer border-slate-50 border-b transition-colors hover:bg-slate-50/50"
            key={batch.id}
            onClick={() => navigate(`/operator/uploads/${batch.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                navigate(`/operator/uploads/${batch.id}`);
              }
            }}
            tabIndex={0}
          >
            <TableCell className="flex items-center gap-2 pl-4 font-medium text-slate-900">
              <i
                aria-hidden="true"
                className={`${FILE_TYPE_ICONS[batch.fileType] ?? "ri-file-line"} text-slate-400`}
              />
              {batch.fileName}
            </TableCell>
            <TableCell className="text-slate-600">
              {batch.fileType.replace(/_/g, " ")}
            </TableCell>
            <TableCell className="text-right font-mono text-slate-600 tabular-nums">
              {batch.recordCount.toLocaleString()}
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {batch.failedCount > 0 ? (
                <span className="text-rose-600">{batch.failedCount}</span>
              ) : (
                <span className="text-slate-400">0</span>
              )}
            </TableCell>
            <TableCell>
              <BatchStatusBadge status={batch.status} />
            </TableCell>
            <TableCell className="text-slate-500 text-sm">
              {formatDate(batch.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
