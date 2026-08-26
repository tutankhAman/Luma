import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVerifiedLoans } from "@/hooks/use-verified-loans";

function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export default function ConsumerDashboard() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { data, isLoading } = useVerifiedLoans(page, search);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="mb-2 font-semibold text-[28px] text-white tracking-tight">
            Verified Records
          </h1>
          <p className="text-[#A1A1AA] text-sm">
            Trusted loan data with full lineage and tamper-evident hashes.
          </p>
        </div>
      </div>

      {data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon="ri-shield-check-line"
            label="Data quality score"
            value={`${data.qualityScore}%`}
          />
          <StatCard
            icon="ri-database-2-line"
            label="Verified loans"
            value={data.pagination.total.toLocaleString()}
          />
          <StatCard
            hint="AI-assisted reviews are flagged per record"
            icon="ri-sparkling-2-line"
            label="With AI assistance"
            value={data.data.filter((item) => item.aiRecommendationUsed).length}
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((row) => (
            <Skeleton className="h-20 w-full" key={row} />
          ))}
        </div>
      )}

      <Card className="rounded-[24px] border border-[#27272A] bg-[#18181B] shadow-2xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">
                Verified loan records
              </CardTitle>
              <CardDescription className="text-[#A1A1AA]">
                Every record carries a SHA-256 hash of its canonical data.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="w-56 rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-1.5 text-[13px] text-white outline-none placeholder:text-[#52525B] focus:border-[#8B5CF6]/40"
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Search by loan ID..."
                type="text"
                value={searchInput}
              />
              <Button onClick={handleSearch} size="sm" variant="outline">
                Search
              </Button>
            </div>
          </div>
          {data ? (
            <div className="space-y-1">
              <Progress value={data.qualityScore} />
              <p className="text-[#A1A1AA] text-xs">
                {data.qualityScore}% of imported loans passed verification on
                first pass
              </p>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((row) => (
                <Skeleton className="h-10 w-full" key={row} />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Source batch</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>AI used</TableHead>
                  <TableHead>Record hash</TableHead>
                  <TableHead>Verified at</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((record) => (
                  <TableRow
                    className="cursor-pointer hover:bg-[#27272A]/20"
                    key={record.id}
                    onClick={() => navigate(`/consumer/loans/${record.id}`)}
                  >
                    <TableCell className="font-medium">
                      {record.loan.loanId}
                    </TableCell>
                    <TableCell>{record.loan.borrowerId}</TableCell>
                    <TableCell className="text-[#A1A1AA] text-xs">
                      {record.sourceBatchRef}
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
                    <TableCell>
                      {record.aiRecommendationUsed ? (
                        <Badge variant="secondary">Yes</Badge>
                      ) : (
                        <span className="text-[#A1A1AA] text-xs">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[#A1A1AA] text-xs tabular-nums">
                      {shortHash(record.recordHash)}
                    </TableCell>
                    <TableCell className="text-[#A1A1AA] text-xs">
                      {new Date(record.verifiedAt).toLocaleString(undefined, {
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        month: "short",
                      })}
                    </TableCell>
                    <TableCell>
                      <i
                        aria-hidden="true"
                        className="ri-arrow-right-s-line text-[#52525B]"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="py-8 text-center text-[#52525B] text-sm"
                      colSpan={8}
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
            <div className="flex items-center justify-between border-[#27272A] border-t px-4 py-3">
              <p className="text-[#52525B] text-xs">
                Page {data.pagination.page} of {data.pagination.totalPages} ·{" "}
                {data.pagination.total.toLocaleString()} total
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
        </CardContent>
      </Card>
    </div>
  );
}
