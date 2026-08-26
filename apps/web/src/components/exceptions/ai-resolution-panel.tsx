import type { ExceptionDetail, ExceptionListItem } from "@repo/types";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ExceptionStatusBadge, SeverityBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiDecision, useExceptionReview } from "@/hooks/use-exceptions";
import { aiApi } from "@/lib/api";

function AiAnalysisBox({
  analysis,
  loading,
}: {
  analysis: ExceptionDetail["aiRecommendation"];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2 rounded-xl border border-[#8B5CF6]/30 bg-[#2E1065]/20 p-4">
        <Skeleton className="h-3 w-24 bg-[#27272A]" />
        <Skeleton className="h-3 w-full bg-[#27272A]" />
        <Skeleton className="h-3 w-4/5 bg-[#27272A]" />
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-[#8B5CF6]/30 bg-[#2E1065]/20 p-4">
      <span className="absolute top-[-10px] left-4 rounded-full bg-[#8B5CF6] px-2 py-0.5 font-bold text-[10px] text-white uppercase tracking-wide">
        AI Analysis
      </span>
      {analysis ? (
        <div className="space-y-3 pt-1">
          <p className="text-[#A1A1AA] text-[13px] leading-relaxed">
            {analysis.reasoning}
          </p>
          {analysis.fieldsToChange.map((change) => (
            <p
              className="rounded-lg border border-[#27272A] bg-black/40 px-2.5 py-1.5 font-mono text-[12px] text-white"
              key={`${change.field}-${change.suggestedValue}`}
            >
              {change.field}:{" "}
              <span className="text-rose-400 line-through">
                {change.currentValue ?? "?"}
              </span>{" "}
              →{" "}
              <span className="text-emerald-400">{change.suggestedValue}</span>
            </p>
          ))}
          <p className="flex flex-wrap gap-x-3 text-[#52525B] text-[11px]">
            <span>{analysis.model}</span>
            <span>{Math.round(analysis.confidence * 100)}% confidence</span>
            <span>{new Date(analysis.timestamp).toLocaleString()}</span>
          </p>
        </div>
      ) : (
        <p className="pt-1 text-[#A1A1AA] text-[13px]">
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
  const [analyzing, setAnalyzing] = useState(false);
  const aiDecision = useAiDecision();
  const { approve, reject } = useExceptionReview();

  const runAnalysis = async () => {
    if (!exception) {
      return;
    }
    setAnalyzing(true);
    try {
      const result = await aiApi.explain(exception.id);
      setAnalysis(result.recommendation);
    } catch (error) {
      toast.error("AI unavailable", {
        description:
          error instanceof Error
            ? error.message
            : "Proceed with manual review.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => setAnalysis(null);

  if (!exception) {
    return (
      <aside className="sticky top-0 hidden h-screen w-[360px] shrink-0 flex-col border-[#27272A] border-l bg-[#09090B] xl:flex">
        <div className="border-[#27272A] border-b p-5">
          <h2 className="flex items-center gap-2 font-medium text-sm text-white">
            <i
              aria-hidden="true"
              className="ri-sparkling-2-line text-[#8B5CF6]"
            />
            AI Resolution Panel
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-center text-[#A1A1AA] text-[13px]">
            Select an exception from the queue to review the AI analysis and
            record your decision.
          </p>
        </div>
      </aside>
    );
  }

  const resolved = exception.status !== "open";

  return (
    <aside className="sticky top-0 hidden h-screen w-[360px] shrink-0 flex-col border-[#27272A] border-l bg-[#09090B] xl:flex">
      <div className="flex items-center justify-between border-[#27272A] border-b p-5">
        <h2 className="flex items-center gap-2 font-medium text-sm text-white">
          <i
            aria-hidden="true"
            className="ri-sparkling-2-line text-[#8B5CF6]"
          />
          AI Resolution
        </h2>
        <Link
          className="text-[#8B5CF6] text-[12px] hover:underline"
          to={`/reviewer/loans/${exception.loan.id}`}
        >
          Open loan →
        </Link>
      </div>

      <div className="custom-scrollbar-hide flex-1 space-y-6 overflow-y-auto p-5">
        <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <SeverityBadge severity={exception.severity} />
            <ExceptionStatusBadge status={exception.status} />
          </div>
          <p className="mt-2.5 font-medium font-mono text-[13px] text-white">
            Loan #{exception.loan.loanId ?? "—"}
          </p>
          <p className="mt-0.5 font-medium text-[13px] text-rose-400">
            {exception.exceptionType.replaceAll("_", " ")}
          </p>
          <p className="mt-1.5 text-[#A1A1AA] text-[12px]">
            {exception.field ? `${exception.field}: ` : ""}
            {exception.message}
          </p>
        </div>

        <AiAnalysisBox analysis={analysis} loading={analyzing} />

        {analysis || analyzing ? null : (
          <Button
            className="w-full bg-[#8B5CF6] font-medium text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:bg-[#7C3AED]"
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
              className="border border-[#27272A] bg-[#18181B] text-white hover:border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-400"
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
              className="bg-[#8B5CF6] font-medium text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:bg-[#7C3AED]"
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

        <div className="space-y-3 border-[#27272A] border-t pt-5">
          <p className="font-medium text-[12px] text-white uppercase tracking-wider">
            Reviewer decision
          </p>
          <p className="text-[#A1A1AA] text-[12px]">
            {resolved
              ? "This exception is resolved. Your decision is recorded in the audit trail."
              : "Approve to resolve as-is (or after correction), or reject to block verification."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="border border-[#27272A] bg-[#18181B] text-white hover:border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-400"
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
              className="bg-[#8B5CF6] font-medium text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:bg-[#7C3AED]"
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
          <p className="text-[#52525B] text-[10px] italic">
            AI output is advisory only — data changes only when a human decides.
          </p>
        </div>
      </div>
    </aside>
  );
}
