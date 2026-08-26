import type { LoanExceptionItem } from "@repo/types";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AuditTimeline } from "@/components/audit/audit-timeline";
import { AiPanel } from "@/components/loan/ai-panel";
import { ExceptionList } from "@/components/loan/exception-list";
import { LoanFieldsPanel } from "@/components/loan/loan-fields-panel";
import { ReviewerActions } from "@/components/loan/reviewer-actions";
import { ValidationStatusBadge } from "@/components/ui/badges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiDecision } from "@/hooks/use-exceptions";
import { useLoan } from "@/hooks/use-loans";

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const loanId = id ?? "";
  const { data: loan, isLoading } = useLoan(loanId);
  const aiDecision = useAiDecision();

  const exceptions = useMemo<LoanExceptionItem[]>(
    () => loan?.exceptions ?? [],
    [loan]
  );
  const [activeExceptionId, setActiveExceptionId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!activeExceptionId && exceptions.length) {
      setActiveExceptionId(exceptions[0]?.id ?? null);
    }
  }, [exceptions, activeExceptionId]);

  const activeException = exceptions.find(
    (item) => item.id === activeExceptionId
  );
  const allResolved = exceptions.every((item) => item.status !== "open");

  if (isLoading || !loan) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          className="flex items-center gap-1 text-[#A1A1AA] text-sm transition-colors hover:text-white"
          to="/reviewer/exceptions"
        >
          <i aria-hidden="true" className="ri-arrow-left-line" />
          Back to queue
        </Link>
        <span aria-hidden="true" className="h-4 w-px bg-[#27272A]" />
        <h1 className="font-heading font-semibold text-2xl text-white tracking-tight">
          Loan {loan.loanId ?? "—"}
          <span className="ml-2 font-normal text-[#52525B] text-base">
            ({loan.borrowerId ?? "—"})
          </span>
        </h1>
        <ValidationStatusBadge status={loan.validationStatus} />
        {loan.verifiedRecord ? (
          <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-emerald-400 text-xs">
            Verified · {loan.verifiedRecord.recordHash.slice(0, 12)}…
          </span>
        ) : null}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
        <LoanFieldsPanel loan={loan} />

        <div className="space-y-4">
          <Card className="rounded-[24px] border border-[#27272A] bg-[#18181B] shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">
                Exceptions ({exceptions.length})
              </CardTitle>
              <CardDescription className="text-[#A1A1AA]">
                Select an exception to review and act on it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ExceptionList
                activeId={activeExceptionId}
                exceptions={exceptions}
                onSelect={setActiveExceptionId}
              />

              {activeException ? (
                <>
                  <AiPanel
                    exceptionId={activeException.id}
                    onDecision={(decision) =>
                      aiDecision.mutate({
                        decision,
                        exceptionId: activeException.id,
                      })
                    }
                  />
                  <ReviewerActions
                    allResolved={allResolved}
                    exceptionId={activeException.id}
                    exceptionStatus={activeException.status}
                    loanId={loan.id}
                  />
                </>
              ) : (
                <p className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400 text-xs">
                  No exceptions on this loan — it can be verified.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AuditTimeline loanId={loan.id} />
    </div>
  );
}
