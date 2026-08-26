import type { AiExplainResponse } from "@repo/types";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { aiApi } from "@/lib/api";
import { mockApi, USE_MOCKS } from "@/lib/mocks";

export function AiPanel({
  exceptionId,
  onDecision,
}: {
  exceptionId: string | null;
  onDecision?: (decision: "accepted" | "edited" | "rejected") => void;
}) {
  const [explanation, setExplanation] = useState<AiExplainResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const runExplain = async () => {
    if (!exceptionId) {
      return;
    }
    setLoading(true);
    try {
      const result = USE_MOCKS
        ? await mockApi.aiExplain()
        : await aiApi.explain(exceptionId);
      setExplanation(result);
    } catch (error) {
      toast.error("AI unavailable", {
        description:
          error instanceof Error
            ? error.message
            : "Proceed with manual review.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!exceptionId) {
    return (
      <p className="rounded-lg bg-muted/50 p-3 text-muted-foreground text-xs">
        Select an exception to get an AI explanation.
      </p>
    );
  }

  const recommendation = explanation?.recommendation ?? null;

  return (
    <div className="space-y-2 rounded-lg border border-indigo-200 border-dashed bg-indigo-50/30 p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-medium text-[13px] text-slate-900">
          <i
            aria-hidden="true"
            className="ri-sparkling-2-line text-indigo-600"
          />
          AI Copilot
        </p>
        <Button
          disabled={loading}
          onClick={() => void runExplain()}
          size="sm"
          variant="outline"
        >
          {loading ? (
            <>
              <i
                aria-hidden="true"
                className="ri-loader-4-line animate-spin text-base"
              />
              Thinking...
            </>
          ) : (
            "Get AI explanation"
          )}
        </Button>
      </div>

      {recommendation ? (
        <div className="space-y-2">
          <p className="font-medium text-[13px]">{recommendation.suggestion}</p>
          <p className="text-muted-foreground text-xs">
            {recommendation.reasoning}
          </p>
          <p className="flex flex-wrap gap-x-3 text-[11px] text-slate-400">
            <span>{recommendation.model}</span>
            <span>
              {Math.round(recommendation.confidence * 100)}% confidence
            </span>
            <span>{new Date(recommendation.timestamp).toLocaleString()}</span>
          </p>
          {onDecision ? (
            <div className="flex gap-1.5 pt-1">
              <Button
                onClick={() => onDecision("accepted")}
                size="sm"
                variant="outline"
              >
                Accept
              </Button>
              <Button
                onClick={() => onDecision("edited")}
                size="sm"
                variant="outline"
              >
                Edit
              </Button>
              <Button
                onClick={() => onDecision("rejected")}
                size="sm"
                variant="ghost"
              >
                Reject
              </Button>
            </div>
          ) : null}
          <p className="text-[10px] text-slate-400 italic">
            AI output is advisory only — it never changes data without a human
            decision.
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          {loading
            ? "Generating structured explanation..."
            : "Ask the copilot why this record failed and what to correct."}
        </p>
      )}
    </div>
  );
}
