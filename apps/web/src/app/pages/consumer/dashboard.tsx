import { Badge } from "@/components/ui/badge";
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
  const { data, isLoading } = useVerifiedLoans();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="font-heading font-semibold text-2xl">
          Verified Records
        </h1>
        <p className="text-muted-foreground text-sm">
          Trusted loan data with full lineage and tamper-evident hashes.
        </p>
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
        <Skeleton className="h-20 w-full" />
      )}

      {data ? (
        <Card>
          <CardHeader className="space-y-3">
            <div>
              <CardTitle>Verified loan records</CardTitle>
              <CardDescription>
                Every record carries a SHA-256 hash of its canonical data.
              </CardDescription>
            </div>
            <div className="space-y-1">
              <Progress value={data.qualityScore} />
              <p className="text-muted-foreground text-xs">
                {data.qualityScore}% of imported loans passed verification on
                first pass
              </p>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[0, 1].map((row) => (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.loan.loanId}
                      </TableCell>
                      <TableCell>{record.loan.borrowerId}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
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
                          <span className="text-muted-foreground text-xs">
                            No
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground text-xs">
                        {shortHash(record.recordHash)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(record.verifiedAt).toLocaleString(undefined, {
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          month: "short",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
