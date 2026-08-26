import type { AiExplainResponse } from "@repo/types";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { aiApi } from "@/lib/api";

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
      const result = await aiApi.explain(exceptionId);
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
      <p className="rounded-lg bg-muted/50 p-3 text-[#A1A1AA] text-xs">
        Select an exception to get an AI explanation.
      </p>
    );
  }

  const recommendation = explanation?.recommendation ?? null;

  return (
    <div className="space-y-2 rounded-lg border border-[#8B5CF6]/30 border-dashed bg-[#2E1065]/30/30 p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-medium text-[13px] text-white">
          <i
            aria-hidden="true"
            className="ri-sparkling-2-line text-[#8B5CF6]"
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
          <p className="text-[#A1A1AA] text-xs">{recommendation.reasoning}</p>
          <p className="flex flex-wrap gap-x-3 text-[#52525B] text-[11px]">
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
          <p className="text-[#52525B] text-[10px] italic">
            AI output is advisory only — it never changes data without a human
            decision.
          </p>
        </div>
      ) : (
        <p className="text-[#A1A1AA] text-xs">
          {loading
            ? "Generating structured explanation..."
            : "Ask the copilot why this record failed and what to correct."}
        </p>
      )}
    </div>
  );
}
