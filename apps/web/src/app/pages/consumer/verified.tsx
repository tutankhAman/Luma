import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
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
    setSearch(searchInput);
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-8">
      <PageHeader
        action={
          <Button
            onClick={() => navigate("/consumer/export")}
            variant="outline"
          >
            <i aria-hidden="true" className="ri-download-2-line" />
            Export
          </Button>
        }
        description="Every record carries a SHA-256 hash of its canonical data."
        eyebrow="Data Consumer"
        title="Verified Records"
      />

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <header className="flex items-center justify-between gap-3 border-border border-b px-5 py-3.5">
          <p className="font-medium text-[13px] text-muted-foreground">
            {data
              ? `${data.pagination.total.toLocaleString()} verified records`
              : "Loading…"}
          </p>
          <div className="flex items-center gap-2">
            <input
              className="h-8 w-56 rounded-lg border border-input bg-background px-3 text-[13px] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
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
            <Button onClick={applySearch} size="sm" variant="outline">
              Search
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton className="h-10 w-full" key={row} />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Record hash</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((record) => (
                <TableRow
                  className="cursor-pointer"
                  key={record.id}
                  onClick={() => navigate(`/consumer/loans/${record.id}`)}
                >
                  <TableCell className="font-medium">
                    <span className="font-mono text-[12.5px]">
                      {record.loan.loanId ?? record.id}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-muted-foreground">
                    {record.loan.borrowerId ?? "—"}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {formatDate(record.verifiedAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        record.validationResult === "passed"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {record.validationResult.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    <span className="font-mono">
                      {shortHash(record.recordHash)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <i
                      aria-hidden="true"
                      className="ri-arrow-right-s-line text-muted-foreground/60"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {data?.data.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-[13px] text-muted-foreground"
                    colSpan={6}
                  >
                    {search
                      ? `No verified loans matching "${search}"`
                      : "No verified loans yet."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}

        {data && data.pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-border border-t px-5 py-3">
            <p className="text-[12px] text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </p>
            <div className="flex gap-1.5">
              <Button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                size="sm"
                variant="outline"
              >
                Previous
              </Button>
              <Button
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
