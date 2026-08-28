import type {
  AiExplainResponse,
  AiRecommendation,
  AiRecommendationFieldChange,
  LoanExceptionItem,
} from "@repo/types";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAiDecision, useExplainException } from "@/hooks/use-ai";
import { cn } from "@/lib/utils";

function FieldDiff({
  item,
  isAccepted,
}: {
  item: AiRecommendationFieldChange;
  isAccepted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]",
        isAccepted ? "border border-success/30 bg-success/10" : "bg-muted/60"
      )}
    >
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
      <span className="font-semibold text-success">{item.suggestedValue}</span>
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
  decisionState,
}: {
  recommendation: AiRecommendation;
  onDismiss: () => void;
  onDecision: (
    type: "accepted" | "edited" | "rejected",
    value?: string
  ) => void;
  decisionPending: boolean;
  decisionState: "accepted" | "edited" | "rejected" | null;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const startEdit = () => {
    setEditing(true);
    setEditValue(recommendation.fieldsToChange[0]?.suggestedValue ?? "");
  };

  const isAccepted = decisionState === "accepted";

  return (
    <div
      className={cn(
        "space-y-2.5 rounded-xl border p-3.5 transition-colors",
        isAccepted
          ? "border-success/40 bg-success/[0.04]"
          : "border-border bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-bold text-[10px] uppercase tracking-wide",
              isAccepted
                ? "bg-success text-success-foreground"
                : "bg-primary/15 text-primary"
            )}
          >
            {isAccepted ? "AI Suggestion Accepted" : "AI Copilot Analysis"}
          </span>
        </div>
        <button
          className="shrink-0 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          onClick={onDismiss}
          type="button"
        >
          <i aria-hidden="true" className="ri-close-line text-sm" />
        </button>
      </div>

      <p className="font-medium text-[13px]">{recommendation.suggestion}</p>

      <p className="text-muted-foreground text-xs leading-relaxed">
        {recommendation.reasoning}
      </p>

      {recommendation.fieldsToChange.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground/60">
            Fields to change:
          </p>
          {recommendation.fieldsToChange.map((item) => (
            <FieldDiff isAccepted={isAccepted} item={item} key={item.field} />
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

      {decisionState === "accepted" ? (
        <div className="rounded-lg border border-success/30 bg-success/8 p-3 text-success">
          <div className="flex items-center gap-1.5 font-semibold text-[12.5px]">
            <i
              aria-hidden="true"
              className="ri-checkbox-circle-fill text-base"
            />
            <span>AI suggestion accepted</span>
          </div>
          <p className="mt-0.5 text-[11.5px] text-foreground/80 leading-relaxed">
            Correction is staged. Please click{" "}
            <strong>Approve exception</strong> below to record your reviewer
            sign-off and seal the record.
          </p>
        </div>
      ) : null}

      {decisionState === "rejected" ? (
        <div className="rounded-lg border border-border bg-muted/50 p-2.5 text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium text-[12px]">
            <i aria-hidden="true" className="ri-close-circle-line text-base" />
            <span>AI suggestion dismissed</span>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed">
            You can approve the exception as-is without edits, or reject below.
          </p>
        </div>
      ) : null}

      {decisionState === null && editing ? (
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
      ) : null}

      {decisionState === null && !editing ? (
        <div className="flex gap-1.5 pt-1">
          <Button
            className="bg-primary font-medium text-primary-foreground hover:bg-primary/90"
            disabled={decisionPending}
            onClick={() => onDecision("accepted")}
            size="sm"
          >
            <i aria-hidden="true" className="ri-check-line text-base" />
            Accept AI
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
      ) : null}

      <p className="text-[10px] text-muted-foreground/60 italic">
        AI output is advisory only — data changes only when a human decides.
      </p>
    </div>
  );
}

function getExplainButtonContent(
  isPending: boolean,
  hasRecommendation: boolean
) {
  if (isPending) {
    return (
      <>
        <i
          aria-hidden="true"
          className="ri-loader-4-line animate-spin text-base"
        />
        Thinking...
      </>
    );
  }
  if (hasRecommendation) {
    return "Refresh analysis";
  }
  return "Get AI explanation";
}

export function AiPanel({
  exception,
  onDecision,
  decisionState,
}: {
  exception: LoanExceptionItem | null;
  onDecision?: (
    decision: "accepted" | "edited" | "rejected",
    editedValue?: string,
    recommendation?: AiRecommendation | null
  ) => void;
  decisionState?: "accepted" | "edited" | "rejected" | null;
}) {
  const [explanation, setExplanation] = useState<AiExplainResponse | null>(
    null
  );
  const [dismissed, setDismissed] = useState(false);
  const explain = useExplainException();
  const aiDecision = useAiDecision();

  useEffect(() => {
    if (exception?.aiRecommendation) {
      setExplanation({
        exceptionId: exception.id,
        recommendation: exception.aiRecommendation as AiRecommendation,
      });
      setDismissed(false);
    } else {
      setExplanation(null);
      setDismissed(false);
    }
  }, [exception]);

  const runExplain = async () => {
    if (!exception?.id) {
      return;
    }
    const result = await explain.mutateAsync(exception.id);
    setExplanation(result);
    setDismissed(false);
  };

  const handleDecision = async (
    type: "accepted" | "edited" | "rejected",
    value?: string
  ) => {
    if (!exception?.id) {
      return;
    }
    const targetRec = explanation?.recommendation ?? null;
    const suggested =
      value ?? targetRec?.fieldsToChange?.[0]?.suggestedValue ?? undefined;

    await aiDecision.mutateAsync({
      decision: type,
      editedValue: suggested,
      exceptionId: exception.id,
    });
    onDecision?.(type, suggested, targetRec);
  };

  if (!exception) {
    return (
      <p className="rounded-lg bg-muted/50 p-3 text-muted-foreground text-xs">
        Select an exception to get an AI explanation.
      </p>
    );
  }

  const recommendation = explanation?.recommendation ?? null;
  const showError = explanation && !recommendation;

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 border-dashed bg-primary/[0.03] p-3.5">
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
          {getExplainButtonContent(explain.isPending, Boolean(recommendation))}
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
          decisionState={decisionState ?? null}
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
