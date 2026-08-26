import type { AiExplainResponse, ExceptionListItem } from "@repo/types";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ExceptionStatusBadge,
  ExceptionTypeBadge,
  SeverityBadge,
} from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAiDecision, useExceptionReview } from "@/hooks/use-exceptions";
import { aiApi } from "@/lib/api";

interface AiAssistantPanelProps {
  exception: ExceptionListItem | null;
  onOpenChange: (open: boolean) => void;
}

export function AiAssistantPanel({
  exception,
  onOpenChange,
}: AiAssistantPanelProps) {
  const [explanation, setExplanation] = useState<AiExplainResponse | null>(
    null
  );
  const [explaining, setExplaining] = useState(false);
  const [editedValue, setEditedValue] = useState("");
  const [note, setNote] = useState("");
  const [correctedValue, setCorrectedValue] = useState("");

  const aiDecision = useAiDecision();
  const { approve, reject } = useExceptionReview();

  const recommendation = explanation?.recommendation ?? null;

  const runExplain = async (exceptionId: string) => {
    setExplaining(true);
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
      setExplaining(false);
    }
  };

  const reset = () => {
    setExplanation(null);
    setEditedValue("");
    setNote("");
    setCorrectedValue("");
  };

  const suggestedValue = useMemo(() => {
    const change = recommendation?.fieldsToChange[0];
    return change?.suggestedValue ?? "";
  }, [recommendation]);

  return (
    <Sheet onOpenChange={onOpenChange} open={Boolean(exception)}>
      <SheetContent className="gap-0 overflow-y-auto bg-gradient-to-b from-[#8B5CF6]/10 to-transparent sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <i
              aria-hidden="true"
              className="ri-sparkling-2-line text-primary"
            />
            Review exception
          </SheetTitle>
          <SheetDescription>
            {exception?.loan.loanId ?? ""} · {exception?.field ?? ""}
          </SheetDescription>
        </SheetHeader>

        {exception ? (
          <div className="flex flex-col gap-4 p-4">
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <ExceptionTypeBadge type={exception.exceptionType} />
                <SeverityBadge severity={exception.severity} />
                <ExceptionStatusBadge status={exception.status} />
              </div>
              <p className="text-sm">{exception.message}</p>
            </div>

            <section
              aria-label="AI recommendation"
              className="space-y-3 rounded-lg border border-dashed p-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">AI recommendation</h3>
                <Button
                  disabled={explaining}
                  onClick={() => void runExplain(exception.id)}
                  size="sm"
                  variant="outline"
                >
                  {explaining ? (
                    <>
                      <i
                        aria-hidden="true"
                        className="ri-loader-4-line animate-spin text-base"
                      />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <i
                        aria-hidden="true"
                        className="ri-magic-line text-base"
                      />
                      Explain
                    </>
                  )}
                </Button>
              </div>

              {recommendation ? (
                <div className="space-y-2 text-xs">
                  <p className="font-medium">{recommendation.suggestion}</p>
                  <p className="text-[#A1A1AA]">{recommendation.reasoning}</p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 rounded-md bg-muted/50 p-2 text-[#A1A1AA]">
                    <dt>Model</dt>
                    <dd className="tabular-nums">{recommendation.model}</dd>
                    <dt>Confidence</dt>
                    <dd className="tabular-nums">
                      {Math.round(recommendation.confidence * 100)}%
                    </dd>
                    <dt>Prompt</dt>
                    <dd>{recommendation.promptSummary}</dd>
                    <dt>Generated</dt>
                    <dd className="tabular-nums">
                      {new Date(recommendation.timestamp).toLocaleString()}
                    </dd>
                  </dl>
                  {recommendedChangeRows(recommendation)}
                </div>
              ) : (
                <p className="text-[#A1A1AA] text-xs">
                  {explaining
                    ? "Generating structured explanation..."
                    : "No recommendation yet. Ask the assistant to explain this exception."}
                </p>
              )}
              <p className="text-[#A1A1AA]/80 text-[0.7rem] italic">
                AI output is advisory only and never changes data until a human
                records a decision.
              </p>

              {recommendation ? (
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      aiDecision.mutate({
                        decision: "accepted",
                        exceptionId: exception.id,
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    <i aria-hidden="true" className="ri-check-line text-base" />
                    Accept
                  </Button>
                  <Button
                    disabled={!editedValue}
                    onClick={() =>
                      aiDecision.mutate({
                        decision: "edited",
                        editedValue,
                        exceptionId: exception.id,
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    <i aria-hidden="true" className="ri-edit-line text-base" />
                    Record edit
                  </Button>
                  <Button
                    onClick={() =>
                      aiDecision.mutate({
                        decision: "rejected",
                        exceptionId: exception.id,
                      })
                    }
                    size="sm"
                    variant="ghost"
                  >
                    Reject
                  </Button>
                </div>
              ) : null}

              {recommendation ? (
                <div className="space-y-1.5">
                  <Label htmlFor="edited-value">Edit suggestion value</Label>
                  <Input
                    id="edited-value"
                    onChange={(e) => setEditedValue(e.target.value)}
                    placeholder={suggestedValue || "Corrected value"}
                    value={editedValue}
                  />
                </div>
              ) : null}
            </section>

            <section
              aria-label="Human decision"
              className="space-y-3 rounded-lg border p-3"
            >
              <h3 className="font-medium text-sm">Human decision</h3>
              <div className="space-y-1.5">
                <Label htmlFor="review-note">Reviewer note</Label>
                <Textarea
                  id="review-note"
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Document your reasoning for the audit trail..."
                  rows={2}
                  value={note}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="corrected-value">
                  Corrected value (optional)
                </Label>
                <Input
                  id="corrected-value"
                  onChange={(e) => setCorrectedValue(e.target.value)}
                  placeholder="Final value to apply on approve"
                  value={correctedValue}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={approve.isPending}
                  onClick={() => {
                    approve.mutate(
                      {
                        correctedValue: correctedValue || undefined,
                        id: exception.id,
                        note: note || undefined,
                      },
                      { onSuccess: () => reset() }
                    );
                  }}
                  size="sm"
                >
                  <i
                    aria-hidden="true"
                    className="ri-check-double-line text-base"
                  />
                  Approve
                </Button>
                <Button
                  disabled={reject.isPending || !note}
                  onClick={() => {
                    reject.mutate(
                      { id: exception.id, note },
                      { onSuccess: () => reset() }
                    );
                  }}
                  size="sm"
                  variant="destructive"
                >
                  <i
                    aria-hidden="true"
                    className="ri-close-circle-line text-base"
                  />
                  Reject loan
                </Button>
              </div>
              <p className="text-[#A1A1AA] text-[0.7rem]">
                Rejection requires a note. All actions are audit logged.
              </p>
            </section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function recommendedChangeRows(
  recommendation: NonNullable<AiExplainResponse["recommendation"]>
) {
  if (!recommendation.fieldsToChange.length) {
    return null;
  }
  return (
    <ul className="space-y-1">
      {recommendation.fieldsToChange.map((change) => (
        <li
          className="rounded-md border bg-background px-2 py-1"
          key={`${change.field}-${change.suggestedValue}`}
        >
          <span className="font-medium">{change.field}</span>:{" "}
          <span className="text-[#A1A1AA] line-through">
            {change.currentValue ?? "?"}
          </span>{" "}
          → <span className="font-medium">{change.suggestedValue}</span>
          {change.source ? (
            <span className="ml-1 text-[#A1A1AA]">({change.source})</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
