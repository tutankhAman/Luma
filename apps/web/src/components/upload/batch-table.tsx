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
      <p className="p-6 text-center text-[#A1A1AA] text-sm">
        No uploads yet — ingest your first loan tape above.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#27272A] border-b bg-[#09090B] hover:bg-[#27272A]/20">
          <TableHead className="px-6 py-4 font-medium text-[#A1A1AA] text-[11px] uppercase tracking-widest">
            File Name
          </TableHead>
          <TableHead className="px-6 py-4 font-medium text-[#A1A1AA] text-[11px] uppercase tracking-widest">
            Type
          </TableHead>
          <TableHead className="px-6 py-4 text-right font-medium text-[#A1A1AA] text-[11px] uppercase tracking-widest">
            Records
          </TableHead>
          <TableHead className="px-6 py-4 text-right font-medium text-[#A1A1AA] text-[11px] uppercase tracking-widest">
            Failed
          </TableHead>
          <TableHead className="px-6 py-4 font-medium text-[#A1A1AA] text-[11px] uppercase tracking-widest">
            Status
          </TableHead>
          <TableHead className="px-6 py-4 font-medium text-[#A1A1AA] text-[11px] uppercase tracking-widest">
            Uploaded At
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map((batch) => (
          <TableRow
            className="cursor-pointer border-[#27272A]/50 border-b transition-colors hover:bg-[#27272A]/20"
            key={batch.id}
            onClick={() => navigate(`/operator/uploads/${batch.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                navigate(`/operator/uploads/${batch.id}`);
              }
            }}
            tabIndex={0}
          >
            <TableCell className="flex items-center gap-3 px-6 py-4 font-medium text-white">
              <i
                aria-hidden="true"
                className={`${FILE_TYPE_ICONS[batch.fileType] ?? "ri-file-line"} text-[#52525B] text-base`}
              />
              {batch.fileName}
            </TableCell>
            <TableCell className="px-6 py-4 text-[#A1A1AA]">
              {batch.fileType.replace(/_/g, " ")}
            </TableCell>
            <TableCell className="px-6 py-4 text-right font-mono text-[#A1A1AA] tabular-nums">
              {batch.recordCount.toLocaleString()}
            </TableCell>
            <TableCell className="px-6 py-4 text-right tabular-nums">
              {batch.failedCount > 0 ? (
                <div className="flex justify-end">
                  <span className="rounded bg-rose-500/10 px-2 py-0.5 font-medium text-rose-400 text-xs">
                    {batch.failedCount}
                  </span>
                </div>
              ) : (
                <span className="font-mono text-[#52525B] text-xs">0</span>
              )}
            </TableCell>
            <TableCell className="px-6 py-4">
              <BatchStatusBadge status={batch.status} />
            </TableCell>
            <TableCell className="px-6 py-4 text-[#52525B] text-sm tabular-nums">
              {formatDate(batch.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
