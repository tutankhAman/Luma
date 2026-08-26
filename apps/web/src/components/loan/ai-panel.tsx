import type {
  AiExplainResponse,
  AiRecommendation,
  AiRecommendationFieldChange,
} from "@repo/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAiDecision, useExplainException } from "@/hooks/use-ai";

function FieldDiff({ item }: { item: AiRecommendationFieldChange }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-black/40 px-3 py-2 text-[12px]">
      <span className="shrink-0 font-medium text-[#A1A1AA]">{item.field}</span>
      <span className="text-rose-400 line-through">
        {item.currentValue ?? "—"}
      </span>
      <i aria-hidden="true" className="ri-arrow-right-s-line text-[#52525B]" />
      <span className="font-medium text-emerald-400">
        {item.suggestedValue}
      </span>
      {item.source ? (
        <span className="ml-auto rounded bg-[#27272A]/60 px-1.5 py-0.5 text-[#A1A1AA] text-[10px]">
          {item.source}
        </span>
      ) : null}
    </div>
  );
}

function RecommendationCard({
  recommendation,
  onDismiss,
  onDecision,
  decisionPending,
}: {
  recommendation: AiRecommendation;
  onDismiss: () => void;
  onDecision: (
    type: "accepted" | "edited" | "rejected",
    value?: string
  ) => void;
  decisionPending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const startEdit = () => {
    setEditing(true);
    setEditValue(recommendation.fieldsToChange[0]?.suggestedValue ?? "");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-[13px] text-white">
          {recommendation.suggestion}
        </p>
        <button
          className="shrink-0 text-[#52525B] transition-colors hover:text-[#A1A1AA]"
          onClick={onDismiss}
          type="button"
        >
          <i aria-hidden="true" className="ri-close-line text-sm" />
        </button>
      </div>

      <p className="text-[#A1A1AA] text-xs">{recommendation.reasoning}</p>

      {recommendation.fieldsToChange.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[#52525B] text-[11px]">Fields to change:</p>
          {recommendation.fieldsToChange.map((item) => (
            <FieldDiff item={item} key={item.field} />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-x-3 text-[#52525B] text-[11px]">
        <span>{recommendation.model}</span>
        <span>{Math.round(recommendation.confidence * 100)}% confidence</span>
        <span>{new Date(recommendation.timestamp).toLocaleString()}</span>
      </div>

      {recommendation.promptSummary ? (
        <p className="border-[#27272A]/40 border-t pt-2 text-[#52525B] text-[11px] italic">
          Prompt: {recommendation.promptSummary}
        </p>
      ) : null}

      {editing ? (
        <div className="space-y-2 pt-1">
          <input
            className="w-full rounded-lg border border-[#8B5CF6]/40 bg-black px-3 py-2 text-[13px] text-white outline-none focus:ring-1 focus:ring-[#8B5CF6]"
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Enter corrected value..."
            type="text"
            value={editValue}
          />
          <div className="flex gap-1.5">
            <Button
              disabled={!editValue || decisionPending}
              onClick={() => {
                onDecision("edited", editValue);
                setEditing(false);
              }}
              size="sm"
            >
              {decisionPending ? "Saving..." : "Save edit"}
            </Button>
            <Button
              onClick={() => {
                setEditing(false);
                setEditValue("");
              }}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-1.5 pt-1">
          <Button
            disabled={decisionPending}
            onClick={() => onDecision("accepted")}
            size="sm"
            variant="outline"
          >
            <i aria-hidden="true" className="ri-check-line text-base" />
            Accept
          </Button>
          <Button onClick={startEdit} size="sm" variant="outline">
            <i aria-hidden="true" className="ri-edit-line text-base" />
            Edit
          </Button>
          <Button
            disabled={decisionPending}
            onClick={() => onDecision("rejected")}
            size="sm"
            variant="ghost"
          >
            <i aria-hidden="true" className="ri-close-line text-base" />
            Reject
          </Button>
        </div>
      )}

      <p className="text-[#52525B] text-[10px] italic">
        AI output is advisory only — it never changes data without a human
        decision.
      </p>
    </div>
  );
}

export function AiPanel({
  exceptionId,
  onDecision,
}: {
  exceptionId: string | null;
  onDecision?: (
    decision: "accepted" | "edited" | "rejected",
    editedValue?: string
  ) => void;
}) {
  const [explanation, setExplanation] = useState<AiExplainResponse | null>(
    null
  );
  const [dismissed, setDismissed] = useState(false);
  const explain = useExplainException();
  const aiDecision = useAiDecision();

  const runExplain = async () => {
    if (!exceptionId) {
      return;
    }
    const result = await explain.mutateAsync(exceptionId);
    setExplanation(result);
    setDismissed(false);
  };

  const handleDecision = async (
    type: "accepted" | "edited" | "rejected",
    value?: string
  ) => {
    if (!exceptionId) {
      return;
    }
    await aiDecision.mutateAsync({
      decision: type,
      editedValue: value,
      exceptionId,
    });
    onDecision?.(type, value);
  };

  if (!exceptionId) {
    return (
      <p className="rounded-lg bg-[#27272A]/20 p-3 text-[#A1A1AA] text-xs">
        Select an exception to get an AI explanation.
      </p>
    );
  }

  const recommendation = explanation?.recommendation ?? null;
  const showError = explanation && !recommendation;

  return (
    <div className="space-y-2 rounded-lg border border-[#8B5CF6]/30 border-dashed bg-[#2E1065]/20 p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-medium text-[13px] text-white">
          <i
            aria-hidden="true"
            className="ri-sparkling-2-line text-[#8B5CF6]"
          />
          AI Copilot
        </p>
        <Button
          disabled={explain.isPending}
          onClick={() => void runExplain()}
          size="sm"
          variant="outline"
        >
          {explain.isPending ? (
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

      {showError ? (
        <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-rose-400 text-xs">
          <i aria-hidden="true" className="ri-error-warning-line mr-1" />
          {explanation.error || "AI is unavailable. Please review manually."}
        </p>
      ) : null}

      {recommendation && !dismissed ? (
        <RecommendationCard
          decisionPending={aiDecision.isPending}
          onDecision={handleDecision}
          onDismiss={() => setDismissed(true)}
          recommendation={recommendation}
        />
      ) : null}

      {recommendation || showError || explain.isPending ? null : (
        <p className="text-[#A1A1AA] text-xs">
          Ask the copilot why this record failed and what to correct.
        </p>
      )}

      {explain.isPending && !recommendation ? (
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-[#27272A]" />
          <div className="h-3 w-full animate-pulse rounded bg-[#27272A]" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-[#27272A]" />
        </div>
      ) : null}
    </div>
  );
}
