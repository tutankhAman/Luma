import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { KpiCard, KpiStrip } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { ValidationResultBadge } from "@/components/ui/badges";
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
import { cn } from "@/lib/utils";

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

type FilterMode = "all" | "passed" | "passed_with_review" | "ai_assisted";

export default function VerifiedRecordsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const { data, isLoading } = useVerifiedLoans(page, search);

  const applySearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const filteredRecords = useMemo(() => {
    const raw = data?.data ?? [];
    if (filterMode === "passed") {
      return raw.filter((r) => r.validationResult === "passed");
    }
    if (filterMode === "passed_with_review") {
      return raw.filter((r) => r.validationResult === "passed_with_review");
    }
    if (filterMode === "ai_assisted") {
      return raw.filter((r) => r.aiRecommendationUsed);
    }
    return raw;
  }, [data?.data, filterMode]);

  const totalVerified = data?.pagination.total ?? 0;
  const aiCount = (data?.data ?? []).filter(
    (r) => r.aiRecommendationUsed
  ).length;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-8">
      <PageHeader
        action={
          <div className="flex items-center gap-2">
            <Button
              className="rounded-full"
              onClick={() => navigate("/consumer/export")}
            >
              <i aria-hidden="true" className="ri-download-2-line" />
              Export Records
            </Button>
          </div>
        }
        description="Tamper-evident mortgage loans sealed with deterministic SHA-256 cryptographic hashes."
        eyebrow="Data Consumer"
        title="Verified Records"
      />

      <KpiStrip>
        <KpiCard
          icon="ri-shield-check-line"
          label="Total verified inventory"
          loading={isLoading}
          trend="up"
          trendLabel="records"
          trendValue="100%"
          value={totalVerified.toLocaleString()}
        />
        <KpiCard
          delta="SHA-256 sealed"
          deltaTone="positive"
          icon="ri-lock-2-line"
          label="Cryptographic integrity"
          loading={isLoading}
          trend="up"
          trendLabel="verified"
          trendValue="100%"
          value="100%"
        />
        <KpiCard
          delta="Audited lineage"
          deltaTone="neutral"
          icon="ri-sparkling-2-line"
          label="AI-assisted reviews"
          loading={isLoading}
          trend="up"
          trendLabel="active"
          trendValue={`${aiCount}`}
          value={`${aiCount}`}
        />
        <KpiCard
          delta="Ready for secondary trade"
          deltaTone="positive"
          icon="ri-file-chart-line"
          label="Export readiness"
          loading={isLoading}
          trend="up"
          trendLabel="certified"
          trendValue="Ready"
          value="Ready"
        />
      </KpiStrip>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <header className="flex flex-col gap-3 border-border border-b bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              className={cn(
                "rounded-full border px-3 py-1 font-medium text-[12px] transition-colors",
                filterMode === "all"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setFilterMode("all")}
              type="button"
            >
              All Records ({totalVerified})
            </button>
            <button
              className={cn(
                "rounded-full border px-3 py-1 font-medium text-[12px] transition-colors",
                filterMode === "passed"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setFilterMode("passed")}
              type="button"
            >
              Passed Clean
            </button>
            <button
              className={cn(
                "rounded-full border px-3 py-1 font-medium text-[12px] transition-colors",
                filterMode === "passed_with_review"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setFilterMode("passed_with_review")}
              type="button"
            >
              Passed with Review
            </button>
            <button
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 font-medium text-[12px] transition-colors",
                filterMode === "ai_assisted"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setFilterMode("ai_assisted")}
              type="button"
            >
              <i
                aria-hidden="true"
                className="ri-sparkling-2-line text-primary"
              />
              AI Resolved
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <i
                aria-hidden="true"
                className="ri-search-line absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60 text-sm"
              />
              <input
                className="h-9 w-60 rounded-lg border border-input bg-background pr-8 pl-9 text-[13px] outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applySearch();
                  }
                }}
                placeholder="Search by loan ID…"
                type="search"
                value={searchInput}
              />
              {searchInput ? (
                <button
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                  type="button"
                >
                  <i aria-hidden="true" className="ri-close-line" />
                </button>
              ) : null}
            </div>
            <Button onClick={applySearch} size="sm" variant="outline">
              Filter
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-3 p-6">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton className="h-11 w-full rounded-lg" key={row} />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Loan ID
                </TableHead>
                <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Borrower ID
                </TableHead>
                <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Verified Date
                </TableHead>
                <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Validation Status
                </TableHead>
                <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  AI Resolution
                </TableHead>
                <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Cryptographic Hash
                </TableHead>
                <TableHead className="text-right text-[11px] text-muted-foreground uppercase tracking-wider">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow
                  className="group cursor-pointer transition-colors hover:bg-accent/40"
                  key={record.id}
                  onClick={() => navigate(`/consumer/loans/${record.id}`)}
                >
                  <TableCell className="font-medium">
                    <span className="font-mono text-[13px] text-foreground transition-colors group-hover:text-primary">
                      {record.loan.loanId ?? record.id}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-[12.5px] text-muted-foreground">
                    {record.loan.borrowerId ?? "—"}
                  </TableCell>
                  <TableCell className="text-[12.5px] text-muted-foreground">
                    {formatDate(record.verifiedAt)}
                  </TableCell>
                  <TableCell>
                    <ValidationResultBadge result={record.validationResult} />
                  </TableCell>
                  <TableCell>
                    {record.aiRecommendationUsed ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-medium text-[11.5px] text-primary">
                        <i aria-hidden="true" className="ri-sparkling-2-line" />
                        AI Copilot
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground/60">
                        Manual
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    <span className="group/hash inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 font-mono">
                      <span>{shortHash(record.recordHash)}</span>
                      <button
                        aria-label={`Copy record hash for ${record.loan.loanId ?? record.id}`}
                        className="rounded p-0.5 text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/hash:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          void navigator.clipboard.writeText(record.recordHash);
                          toast.success("Cryptographic SHA-256 hash copied");
                        }}
                        type="button"
                      >
                        <i
                          aria-hidden="true"
                          className="ri-file-copy-line text-[13px]"
                        />
                      </button>
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      className="h-8 text-[12px]"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/consumer/loans/${record.id}`);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      View Dossier
                      <i
                        aria-hidden="true"
                        className="ri-arrow-right-s-line ml-1 text-muted-foreground/60"
                      />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-14 text-center text-[13px] text-muted-foreground"
                    colSpan={7}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <i
                        aria-hidden="true"
                        className="ri-shield-line text-3xl text-muted-foreground/40"
                      />
                      <p className="font-medium">No verified records found</p>
                      <p className="text-[12px] text-muted-foreground/70">
                        {search
                          ? `No loans match "${search}". Try clearing the search query.`
                          : "Verified records will appear here as reviewers seal loans."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}

        {data && data.pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-border border-t bg-muted/20 px-5 py-3.5">
            <p className="text-[12px] text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages} ·{" "}
              {data.pagination.total} total records
            </p>
            <div className="flex gap-2">
              <Button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                size="sm"
                variant="outline"
              >
                <i aria-hidden="true" className="ri-arrow-left-s-line" />
                Previous
              </Button>
              <Button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
                size="sm"
                variant="outline"
              >
                Next
                <i aria-hidden="true" className="ri-arrow-right-s-line" />
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
