import type { AiRecommendation, LoanExceptionItem } from "@repo/types";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AuditTimeline } from "@/components/audit/audit-timeline";
import { AiPanel } from "@/components/loan/ai-panel";
import { DiffViewer } from "@/components/loan/diff-viewer";
import { ExceptionList } from "@/components/loan/exception-list";
import { LoanFieldsPanel } from "@/components/loan/loan-fields-panel";
import { ReviewerActions } from "@/components/loan/reviewer-actions";
import { VerificationStatus } from "@/components/loan/verification-status";
import { ValidationStatusBadge } from "@/components/ui/badges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDraftNote } from "@/hooks/use-ai";
import { useLoan } from "@/hooks/use-loans";

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const loanId = id ?? "";
  const { data: loan, isLoading } = useLoan(loanId);
  const draftNote = useDraftNote();
  const [conflictOpen, setConflictOpen] = useState(false);
  const [note, setNote] = useState("");
  const [decisionState, setDecisionState] = useState<
    "accepted" | "rejected" | "edited" | null
  >(null);
  const [stagedValue, setStagedValue] = useState<string>("");

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

  const handleSelectException = (selectedExceptionId: string | null) => {
    setActiveExceptionId(selectedExceptionId);
    setDecisionState(null);
    setStagedValue("");
  };

  const activeException = exceptions.find(
    (item) => item.id === activeExceptionId
  );
  const allResolved = exceptions.every((item) => item.status !== "open");
  const conflicts = exceptions.filter(
    (item) => item.exceptionType === "conflicting_source"
  );

  const handleNoteDraft = (exceptionId: string | null) => {
    if (!exceptionId) {
      return;
    }
    draftNote.mutate(exceptionId, {
      onSuccess: (result) => {
        if (result.note) {
          setNote(result.note);
        }
      },
    });
  };

  if (isLoading || !loan) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
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
          className="flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
          to="/reviewer/exceptions"
        >
          <i aria-hidden="true" className="ri-arrow-left-line" />
          Back to queue
        </Link>
        <span aria-hidden="true" className="h-4 w-px bg-border" />
        <h1 className="font-semibold text-[28px] tracking-tight">
          Loan {loan.loanId ?? "—"}
          <span className="ml-2 font-normal text-base text-muted-foreground/60">
            ({loan.borrowerId ?? "—"})
          </span>
        </h1>
        <ValidationStatusBadge status={loan.validationStatus} />
        <VerificationStatus verifiedRecord={loan.verifiedRecord} />
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_400px]">
        <LoanFieldsPanel className="h-full" loan={loan} />

        <div className="flex h-full flex-col">
          <Card className="flex h-full min-h-[640px] flex-col rounded-[24px] border border-border lg:max-h-[860px]">
            <CardHeader className="shrink-0 border-border/50 border-b pb-3">
              <CardTitle>Exceptions ({exceptions.length})</CardTitle>
              <CardDescription className="text-muted-foreground">
                Select an exception to review and act on it.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 overflow-y-auto p-4">
              <ExceptionList
                activeId={activeExceptionId}
                exceptions={exceptions}
                onSelect={handleSelectException}
              />

              {activeException ? (
                <>
                  {conflicts.length > 0 &&
                  activeException.exceptionType === "conflicting_source" ? (
                    <div className="space-y-2">
                      <button
                        aria-expanded={conflictOpen}
                        className="flex w-full items-center justify-between rounded-lg border border-primary/30 bg-primary/[0.05] px-3.5 py-2.5 text-left transition-colors hover:bg-primary/10"
                        onClick={() => setConflictOpen(!conflictOpen)}
                        type="button"
                      >
                        <span className="flex items-center gap-2">
                          <i
                            aria-hidden="true"
                            className="ri-split-cells-vertical text-[15px] text-primary"
                          />
                          <span className="font-medium text-[13px]">
                            Compare conflicting records
                          </span>
                        </span>
                        <i
                          aria-hidden="true"
                          className={`ri-arrow-down-s-line text-muted-foreground transition-transform ${conflictOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {conflictOpen ? (
                        <DiffViewer
                          exception={activeException}
                          recommendation={
                            (activeException.aiRecommendation as AiRecommendation | null) ??
                            null
                          }
                        />
                      ) : null}
                    </div>
                  ) : null}
                  <AiPanel
                    decisionState={decisionState}
                    exception={activeException}
                    onDecision={(type, editedValue, recommendation) => {
                      setDecisionState(type);
                      if (type === "accepted" || type === "edited") {
                        const val =
                          editedValue ??
                          recommendation?.fieldsToChange?.[0]?.suggestedValue ??
                          "";
                        setStagedValue(val);
                        if (!note && recommendation) {
                          setNote(
                            `Approved with AI correction (${recommendation.model}): ${recommendation.reasoning}`
                          );
                        }
                      }
                    }}
                  />
                  <ReviewerActions
                    allResolved={allResolved}
                    decisionState={decisionState}
                    exceptionId={activeException.id}
                    exceptionStatus={activeException.status}
                    loanId={loan.id}
                    note={note}
                    onNoteChange={setNote}
                    onNoteDrafted={() => handleNoteDraft(activeException.id)}
                    requestingDraft={draftNote.isPending}
                    stagedValue={stagedValue}
                    verifiedRecord={loan.verifiedRecord}
                  />
                </>
              ) : (
                <p className="rounded-lg border border-success/25 bg-success/10 p-3 text-success text-xs">
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
