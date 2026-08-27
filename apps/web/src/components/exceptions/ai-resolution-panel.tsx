import type { ExceptionDetail, ExceptionListItem } from "@repo/types";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ExceptionStatusBadge, SeverityBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiDecision, useExplainException } from "@/hooks/use-ai";
import { useExceptionReview } from "@/hooks/use-exceptions";

function AiAnalysisBox({
  analysis,
  loading,
}: {
  analysis: ExceptionDetail["aiRecommendation"];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2 rounded-xl border border-primary/25 bg-primary/[0.05] p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-primary/25 bg-primary/[0.05] p-4">
      <span className="absolute top-[-10px] left-4 rounded-full bg-primary px-2 py-0.5 font-bold text-[10px] text-primary-foreground uppercase tracking-wide">
        AI Analysis
      </span>
      {analysis ? (
        <div className="space-y-3 pt-1">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {analysis.reasoning}
          </p>
          {analysis.fieldsToChange.map((change) => (
            <p
              className="rounded-lg border border-border bg-muted/60 px-2.5 py-1.5 font-mono text-[12px]"
              key={`${change.field}-${change.suggestedValue}`}
            >
              {change.field}:{" "}
              <span className="text-destructive line-through">
                {change.currentValue ?? "?"}
              </span>{" "}
              → <span className="text-success">{change.suggestedValue}</span>
            </p>
          ))}
          <p className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground/60">
            <span>{analysis.model}</span>
            <span>{Math.round(analysis.confidence * 100)}% confidence</span>
            <span>{new Date(analysis.timestamp).toLocaleString()}</span>
          </p>
        </div>
      ) : (
        <p className="pt-1 text-[13px] text-muted-foreground">
          No analysis yet — generate one to see the suggested correction with
          confidence and reasoning.
        </p>
      )}
    </div>
  );
}

export function AiResolutionPanel({
  exception,
}: {
  exception: ExceptionListItem | null;
}) {
  const [analysis, setAnalysis] =
    useState<ExceptionDetail["aiRecommendation"]>(null);
  const explain = useExplainException();
  const aiDecision = useAiDecision();
  const { approve, reject } = useExceptionReview();

  const runAnalysis = async () => {
    if (!exception) {
      return;
    }
    const result = await explain.mutateAsync(exception.id);
    setAnalysis(result.recommendation);
  };

  const reset = () => setAnalysis(null);

  if (!exception) {
    return (
      <aside className="sticky top-0 hidden h-screen w-[360px] shrink-0 flex-col border-border border-l bg-sidebar xl:flex">
        <div className="border-border border-b p-5">
          <h2 className="flex items-center gap-2 font-medium text-sm">
            <i
              aria-hidden="true"
              className="ri-sparkling-2-line text-primary"
            />
            AI Resolution Panel
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-center text-[13px] text-muted-foreground">
            Select an exception from the queue to review the AI analysis and
            record your decision.
          </p>
        </div>
      </aside>
    );
  }

  const resolved = exception.status !== "open";

  return (
    <aside className="sticky top-0 hidden h-screen w-[360px] shrink-0 flex-col border-border border-l bg-sidebar xl:flex">
      <div className="flex items-center justify-between border-border border-b p-5">
        <h2 className="flex items-center gap-2 font-medium text-sm">
          <i aria-hidden="true" className="ri-sparkling-2-line text-primary" />
          AI Resolution
        </h2>
        <Link
          className="text-[12px] text-primary hover:underline"
          to={`/reviewer/loans/${exception.loan.id}`}
        >
          Open loan →
        </Link>
      </div>

      <div className="custom-scrollbar-hide flex-1 space-y-6 overflow-y-auto p-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <SeverityBadge severity={exception.severity} />
            <ExceptionStatusBadge status={exception.status} />
          </div>
          <p className="mt-2.5 font-medium font-mono text-[13px]">
            Loan #{exception.loan.loanId ?? "—"}
          </p>
          <p className="mt-0.5 font-medium text-[13px] text-destructive">
            {exception.exceptionType.replaceAll("_", " ")}
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            {exception.field ? `${exception.field}: ` : ""}
            {exception.message}
          </p>
        </div>

        <AiAnalysisBox analysis={analysis} loading={explain.isPending} />

        {analysis || explain.isPending ? null : (
          <Button
            className="w-full bg-primary font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => void runAnalysis()}
            size="sm"
          >
            <i aria-hidden="true" className="ri-magic-line text-base" />
            Generate AI analysis
          </Button>
        )}

        {analysis ? (
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="border border-border bg-card hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              disabled={aiDecision.isPending}
              onClick={() => {
                aiDecision.mutate(
                  { decision: "rejected", exceptionId: exception.id },
                  { onSettled: reset }
                );
              }}
              variant="outline"
            >
              Reject AI
            </Button>
            <Button
              className="bg-primary font-medium text-primary-foreground hover:bg-primary/90"
              disabled={aiDecision.isPending}
              onClick={() => {
                aiDecision.mutate(
                  { decision: "accepted", exceptionId: exception.id },
                  { onSettled: reset }
                );
              }}
            >
              Accept AI
            </Button>
          </div>
        ) : null}

        <div className="space-y-3 border-border border-t pt-5">
          <p className="font-medium text-[12px] text-muted-foreground uppercase tracking-wider">
            Reviewer decision
          </p>
          <p className="text-[12px] text-muted-foreground">
            {resolved
              ? "This exception is resolved. Your decision is recorded in the audit trail."
              : "Approve to resolve as-is (or after correction), or reject to block verification."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="border border-border bg-card hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              disabled={resolved || reject.isPending}
              onClick={() =>
                reject.mutate(
                  {
                    id: exception.id,
                    note: "Rejected from AI resolution panel",
                  },
                  { onSettled: reset }
                )
              }
              variant="outline"
            >
              Reject
            </Button>
            <Button
              className="bg-primary font-medium text-primary-foreground hover:bg-primary/90"
              disabled={resolved || approve.isPending}
              onClick={() =>
                approve.mutate(
                  {
                    id: exception.id,
                    note: "Approved from AI resolution panel",
                  },
                  { onSettled: reset }
                )
              }
            >
              Approve
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/60 italic">
            AI output is advisory only — data changes only when a human decides.
          </p>
        </div>
      </div>
    </aside>
  );
}
