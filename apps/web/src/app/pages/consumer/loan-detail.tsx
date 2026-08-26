import { Link, useParams } from "react-router-dom";
import { AuditTimeline } from "@/components/audit/audit-timeline";
import { VerificationStatus } from "@/components/loan/verification-status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useVerifiedLoanDetail } from "@/hooks/use-verified-loans";

const FIELD_LABELS: Record<string, string> = {
  borrowerId: "Borrower ID",
  borrowerState: "Borrower State",
  creditGrade: "Credit Grade",
  currentBalance: "Current Balance",
  daysPastDue: "Days Past Due",
  documentStatus: "Document Status",
  employmentLength: "Employment Length",
  incomeBand: "Income Band",
  interestRate: "Interest Rate",
  lastPaymentDate: "Last Payment Date",
  loanId: "Loan ID",
  loanPurpose: "Loan Purpose",
  loanType: "Loan Type",
  maturityDate: "Maturity Date",
  originalPrincipal: "Original Principal",
  originationDate: "Origination Date",
  paymentStatus: "Payment Status",
  servicerName: "Servicer Name",
  sourceSystem: "Source System",
  termMonths: "Term (Months)",
};

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (key === "currentBalance" || key === "originalPrincipal") {
    const num = Number(value);
    return Number.isFinite(num)
      ? `$${num.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : String(value);
  }
  if (key === "interestRate") {
    return `${value}%`;
  }
  return String(value);
}

export default function ConsumerLoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const loanId = id ?? "";
  const { data: loan, isLoading } = useVerifiedLoanDetail(loanId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-[#A1A1AA] text-sm">Loan not found.</p>
      </div>
    );
  }

  const canonicalEntries = Object.entries(loan.canonicalData).filter(
    ([, value]) => value !== null && value !== undefined
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          className="flex items-center gap-1 text-[#A1A1AA] text-sm transition-colors hover:text-white"
          to="/consumer/dashboard"
        >
          <i aria-hidden="true" className="ri-arrow-left-line" />
          Back to records
        </Link>
        <span aria-hidden="true" className="h-4 w-px bg-[#27272A]" />
        <h1 className="font-semibold text-[28px] text-white tracking-tight">
          {loan.loanId ?? "—"}
        </h1>
        <VerificationStatus
          verifiedRecord={
            loan.recordHash
              ? { recordHash: loan.recordHash, verifiedAt: loan.verifiedAt }
              : null
          }
        />
      </div>

      <Card className="rounded-[24px] border border-[#27272A] bg-[#18181B] shadow-2xl">
        <CardHeader>
          <CardTitle className="text-white">Canonical Data</CardTitle>
          <CardDescription className="text-[#A1A1AA]">
            Verified field values from the source loan tape.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {canonicalEntries.map(([key, value]) => (
              <div
                className="flex items-baseline justify-between gap-2 border-[#27272A] border-b pb-2"
                key={key}
              >
                <span className="text-[#A1A1AA] text-xs">
                  {FIELD_LABELS[key] ?? key}
                </span>
                <span className="text-right font-medium text-[13px] text-white">
                  {formatValue(key, value)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[24px] border border-[#27272A] bg-[#18181B] shadow-2xl">
        <CardHeader>
          <CardTitle className="text-white">Record Integrity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[#A1A1AA] text-xs">
              Record hash (SHA-256)
            </span>
            <span className="max-w-md truncate font-mono text-[#8B5CF6] text-[12px]">
              {loan.recordHash}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#A1A1AA] text-xs">Source batch</span>
            <span className="text-[13px] text-white">
              {loan.sourceBatchRef}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#A1A1AA] text-xs">Validation result</span>
            <span className="text-[13px] text-white capitalize">
              {loan.validationResult.replaceAll("_", " ")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#A1A1AA] text-xs">Verified at</span>
            <span className="text-[13px] text-white">
              {new Date(loan.verifiedAt).toLocaleString()}
            </span>
          </div>
          {loan.aiRecommendationUsed ? (
            <div className="flex items-center justify-between">
              <span className="text-[#A1A1AA] text-xs">AI assistance</span>
              <span className="flex items-center gap-1 text-[#8B5CF6] text-[13px]">
                <i aria-hidden="true" className="ri-sparkling-2-line text-sm" />
                Used
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AuditTimeline loanId={loanId} />
    </div>
  );
}
