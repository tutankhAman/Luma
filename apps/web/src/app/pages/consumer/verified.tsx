import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVerifiedLoans } from "@/hooks/use-verified-loans";

/* Spec §6.2 — Verified Records list (Module E). */

function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

export default function VerifiedRecordsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { data, isLoading } = useVerifiedLoans(page, search);

  const applySearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const aiAssistedCount =
    data?.data.filter((d) => d.aiRecommendationUsed).length ?? 0;

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-6">
      <PageHeader
        action={
          <div className="flex items-center gap-2">
            <Button
              className="h-8.5 rounded-lg text-xs"
              onClick={() => navigate("/consumer/export")}
              variant="outline"
            >
              <i aria-hidden="true" className="ri-download-2-line" />
              Export Records
            </Button>
            <Button
              className="h-8.5 rounded-lg text-xs"
              onClick={() => navigate("/consumer/audit")}
              variant="ghost"
            >
              <i aria-hidden="true" className="ri-history-line" />
              Audit Trail
            </Button>
          </div>
        }
        description="Every sealed loan carries a deterministic SHA-256 hash of its canonical 22 fields."
        eyebrow="Data Consumer"
        title="Verified Records"
      />

      {/* Mini Stats Ribbon */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Total Sealed
            </p>
            <p className="font-semibold text-foreground text-lg tabular-nums">
              {data ? data.pagination.total.toLocaleString() : "—"}
            </p>
          </div>
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <i aria-hidden="true" className="ri-shield-check-line text-base" />
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Integrity Status
            </p>
            <p className="font-semibold text-lg text-success tabular-nums">
              100% SHA-256
            </p>
          </div>
          <span className="flex size-8 items-center justify-center rounded-lg bg-success/10 text-success">
            <i aria-hidden="true" className="ri-lock-2-line text-base" />
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              AI Assisted
            </p>
            <p className="font-semibold text-lg text-primary tabular-nums">
              {data ? `${aiAssistedCount} records` : "—"}
            </p>
          </div>
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <i aria-hidden="true" className="ri-sparkling-2-line text-base" />
          </span>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <header className="flex flex-wrap items-center justify-between gap-3 border-border border-b bg-muted/20 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[13px] text-foreground">
              Inventory
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
              {data ? data.pagination.total : 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <i
                aria-hidden="true"
                className="ri-search-line absolute top-1/2 left-2.5 -translate-y-1/2 text-[13px] text-muted-foreground/70"
              />
              <input
                className="h-8 w-48 rounded-lg border border-input bg-background pr-7 pl-8 text-[12px] outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 sm:w-60"
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applySearch();
                  }
                }}
                placeholder="Search loan or borrower ID…"
                type="search"
                value={searchInput}
              />
              {searchInput ? (
                <button
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                  type="button"
                >
                  <i aria-hidden="true" className="ri-close-line text-xs" />
                </button>
              ) : null}
            </div>
            <Button
              className="h-8 text-xs"
              onClick={applySearch}
              size="sm"
              variant="outline"
            >
              Filter
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton className="h-9 w-full" key={row} />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="py-2.5 text-[11px] text-muted-foreground uppercase tracking-wider">
                  Loan ID
                </TableHead>
                <TableHead className="py-2.5 text-[11px] text-muted-foreground uppercase tracking-wider">
                  Borrower
                </TableHead>
                <TableHead className="py-2.5 text-[11px] text-muted-foreground uppercase tracking-wider">
                  Verified Date
                </TableHead>
                <TableHead className="py-2.5 text-[11px] text-muted-foreground uppercase tracking-wider">
                  AI Review
                </TableHead>
                <TableHead className="py-2.5 text-[11px] text-muted-foreground uppercase tracking-wider">
                  Validation
                </TableHead>
                <TableHead className="py-2.5 text-[11px] text-muted-foreground uppercase tracking-wider">
                  Record Hash (SHA-256)
                </TableHead>
                <TableHead className="w-10 py-2.5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((record) => (
                <TableRow
                  className="cursor-pointer transition-colors hover:bg-accent/40"
                  key={record.id}
                  onClick={() => navigate(`/consumer/loans/${record.id}`)}
                >
                  <TableCell className="py-2.5 font-medium">
                    <span className="font-mono font-semibold text-[13px] text-foreground">
                      {record.loan.loanId ?? record.id}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 font-mono text-[12px] text-muted-foreground">
                    {record.loan.borrowerId ?? "—"}
                  </TableCell>
                  <TableCell className="py-2.5 text-[12px] text-muted-foreground">
                    {formatDate(record.verifiedAt)}
                  </TableCell>
                  <TableCell className="py-2.5">
                    {record.aiRecommendationUsed ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 font-medium text-[11px] text-primary">
                        <i
                          aria-hidden="true"
                          className="ri-sparkling-2-line text-[11px]"
                        />
                        AI Assisted
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/60">
                        Manual
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge
                      className="text-[11px]"
                      variant={
                        record.validationResult === "passed"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {record.validationResult.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 text-[12px]">
                    <span className="group/hash inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-muted/40 px-2 py-0.5">
                      <span className="font-mono text-[11.5px] text-muted-foreground">
                        {shortHash(record.recordHash)}
                      </span>
                      <button
                        aria-label={`Copy record hash for ${record.loan.loanId ?? record.id}`}
                        className="rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground"
                        onClick={(event) => {
                          event.stopPropagation();
                          void navigator.clipboard.writeText(record.recordHash);
                          toast.success("SHA-256 record hash copied");
                        }}
                        type="button"
                      >
                        <i
                          aria-hidden="true"
                          className="ri-file-copy-line text-[12px]"
                        />
                      </button>
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <i
                      aria-hidden="true"
                      className="ri-arrow-right-s-line text-[15px] text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {data?.data.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-12 text-center text-[13px] text-muted-foreground"
                    colSpan={7}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <i
                        aria-hidden="true"
                        className="ri-inbox-line text-2xl text-muted-foreground/40"
                      />
                      <p className="font-medium text-foreground">
                        {search
                          ? `No verified loans matching "${search}"`
                          : "No verified loans yet."}
                      </p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {search
                          ? "Try a different loan ID or clear search."
                          : "Reviewers will seal loans once validation checks pass."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}

        {data && data.pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-border border-t bg-muted/10 px-4 py-2.5">
            <p className="text-[12px] text-muted-foreground tabular-nums">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </p>
            <div className="flex gap-1.5">
              <Button
                className="h-7 px-2.5 text-xs"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                size="sm"
                variant="outline"
              >
                Previous
              </Button>
              <Button
                className="h-7 px-2.5 text-xs"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
                size="sm"
                variant="outline"
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
