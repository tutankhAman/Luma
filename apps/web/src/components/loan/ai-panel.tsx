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
    <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-[12px]">
      <span className="shrink-0 font-medium text-muted-foreground">
        {item.field}
      </span>
      <span className="text-destructive line-through">
        {item.currentValue ?? "—"}
      </span>
      <i
        aria-hidden="true"
        className="ri-arrow-right-s-line text-muted-foreground/60"
      />
      <span className="font-medium text-success">{item.suggestedValue}</span>
      {item.source ? (
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
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
        <p className="font-medium text-[13px]">{recommendation.suggestion}</p>
        <button
          className="shrink-0 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          onClick={onDismiss}
          type="button"
        >
          <i aria-hidden="true" className="ri-close-line text-sm" />
        </button>
      </div>

      <p className="text-muted-foreground text-xs">
        {recommendation.reasoning}
      </p>

      {recommendation.fieldsToChange.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground/60">
            Fields to change:
          </p>
          {recommendation.fieldsToChange.map((item) => (
            <FieldDiff item={item} key={item.field} />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground/60">
        <span>{recommendation.model}</span>
        <span>{Math.round(recommendation.confidence * 100)}% confidence</span>
        <span>{new Date(recommendation.timestamp).toLocaleString()}</span>
      </div>

      {recommendation.promptSummary ? (
        <p className="border-border/60 border-t pt-2 text-[11px] text-muted-foreground/60 italic">
          Prompt: {recommendation.promptSummary}
        </p>
      ) : null}

      {editing ? (
        <div className="space-y-2 pt-1">
          <input
            className="w-full rounded-lg border border-primary/40 bg-background px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-ring/40"
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

      <p className="text-[10px] text-muted-foreground/60 italic">
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
      <p className="rounded-lg bg-muted/50 p-3 text-muted-foreground text-xs">
        Select an exception to get an AI explanation.
      </p>
    );
  }

  const recommendation = explanation?.recommendation ?? null;
  const showError = explanation && !recommendation;

  return (
    <div className="space-y-2 rounded-lg border border-primary/30 border-dashed bg-primary/[0.05] p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-medium text-[13px]">
          <i aria-hidden="true" className="ri-sparkling-2-line text-primary" />
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
        <p className="rounded-lg border border-destructive/25 bg-destructive/8 p-3 text-destructive text-xs">
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
        <p className="text-muted-foreground text-xs">
          Ask the copilot why this record failed and what to correct.
        </p>
      )}

      {explain.isPending && !recommendation ? (
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      ) : null}
    </div>
  );
}
