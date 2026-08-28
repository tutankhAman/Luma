import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddComment, useExceptionReview } from "@/hooks/use-exceptions";
import { useVerifyLoan } from "@/hooks/use-loans";
import { cn } from "@/lib/utils";

function confirmLabel(
  pending: boolean,
  action: "approve" | "reject" | null
): string {
  if (pending) {
    return "Working...";
  }
  return action === "approve" ? "Confirm approve" : "Confirm reject";
}

function getDialogTitle(
  action: "approve" | "reject" | null,
  isAiAccepted: boolean
): string {
  if (action === "approve") {
    return isAiAccepted ? "Approve with AI Fix?" : "Approve this exception?";
  }
  return "Reject this exception?";
}

function getDialogDescription(
  action: "approve" | "reject" | null,
  isAiAccepted: boolean
): string {
  if (action === "approve") {
    return isAiAccepted
      ? "The exception will be approved with the staged AI corrected value and recorded in the audit trail."
      : "The exception will be marked approved and the decision audit logged.";
  }
  return "The loan cannot be verified while this exception is rejected.";
}

function VerifyLoanSection({
  allResolved,
  loanId,
}: {
  allResolved: boolean;
  loanId: string;
}) {
  const verifyLoan = useVerifyLoan(loanId);
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        allResolved
          ? "border-primary/40 bg-primary/[0.04]"
          : "border-border bg-muted/40"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[13.5px]">Verify loan</p>
            {allResolved ? (
              <span className="rounded-full bg-success/15 px-2 py-0.5 font-semibold text-[10px] text-success uppercase tracking-wider">
                Ready to seal
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            {allResolved
              ? "All exceptions resolved — create immutable verified record."
              : "Resolve all exceptions above before verifying."}
          </p>
        </div>
        <Button
          className={cn(
            allResolved &&
              "bg-primary font-medium text-primary-foreground hover:bg-primary/90"
          )}
          disabled={!allResolved || verifyLoan.isPending}
          onClick={() => verifyLoan.mutate()}
          size="sm"
        >
          {verifyLoan.isPending ? (
            <>
              <i
                aria-hidden="true"
                className="ri-loader-4-line animate-spin text-base"
              />
              Sealing...
            </>
          ) : (
            <>
              <i
                aria-hidden="true"
                className="ri-shield-check-line text-base"
              />
              {allResolved ? "Seal & Verify" : "Verify"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function ReviewerActions({
  allResolved,
  exceptionId,
  exceptionStatus,
  loanId,
  note,
  onNoteChange,
  onNoteDrafted,
  requestingDraft,
  stagedValue,
  decisionState,
}: {
  allResolved: boolean;
  exceptionId: string | null;
  exceptionStatus: string;
  loanId: string;
  note: string;
  onNoteChange: (note: string) => void;
  onNoteDrafted?: () => void;
  requestingDraft?: boolean;
  stagedValue?: string;
  decisionState?: "accepted" | "rejected" | "edited" | null;
}) {
  const [correctedValue, setCorrectedValue] = useState(stagedValue ?? "");
  const [confirmAction, setConfirmAction] = useState<
    "approve" | "reject" | null
  >(null);

  const { approve, reject } = useExceptionReview();
  const addComment = useAddComment();

  useEffect(() => {
    if (stagedValue !== undefined) {
      setCorrectedValue(stagedValue);
    }
  }, [stagedValue]);

  const resolved = exceptionStatus !== "open";
  const isAiAccepted = decisionState === "accepted";

  const runConfirm = () => {
    if (!(exceptionId && confirmAction)) {
      return;
    }
    if (confirmAction === "approve") {
      approve.mutate(
        {
          correctedValue: correctedValue || undefined,
          id: exceptionId,
          note: note || undefined,
        },
        { onSettled: () => setConfirmAction(null) }
      );
    } else {
      reject.mutate(
        { id: exceptionId, note: note || "Rejected by reviewer" },
        { onSettled: () => setConfirmAction(null) }
      );
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-muted-foreground" htmlFor="reviewer-note">
          Reviewer note
        </Label>
        <Textarea
          id="reviewer-note"
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Document your reasoning for the audit trail..."
          rows={2}
          value={note}
        />
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] text-primary transition-colors hover:bg-primary/8 disabled:opacity-50"
            disabled={requestingDraft || !exceptionId}
            onClick={() => onNoteDrafted?.()}
            type="button"
          >
            <i
              aria-hidden="true"
              className={cn(
                "ri-sparkling-2-line text-[12px]",
                requestingDraft && "animate-pulse"
              )}
            />
            {requestingDraft ? "Drafting…" : "Generate reviewer note (AI)"}
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={!note.trim() || addComment.isPending || !exceptionId}
            onClick={() => {
              if (!exceptionId) {
                return;
              }
              void addComment
                .mutateAsync({ exceptionId, note: note.trim() })
                .then(() => onNoteChange(""));
            }}
            size="sm"
            variant="outline"
          >
            <i aria-hidden="true" className="ri-chat-3-line text-base" />
            Add note
          </Button>
        </div>
      </div>

      {resolved ? (
        <div
          className={cn(
            "rounded-xl border p-3.5",
            exceptionStatus === "approved"
              ? "border-success/30 bg-success/8 text-success"
              : "border-destructive/30 bg-destructive/8 text-destructive"
          )}
        >
          <div className="flex items-center gap-2 font-semibold text-[13px]">
            <i
              aria-hidden="true"
              className={
                exceptionStatus === "approved"
                  ? "ri-checkbox-circle-fill text-base"
                  : "ri-close-circle-fill text-base"
              }
            />
            <span>
              {exceptionStatus === "approved"
                ? "Exception approved & resolved"
                : "Exception rejected"}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-foreground/80 leading-relaxed">
            {exceptionStatus === "approved"
              ? "This exception has been approved and its values applied to the loan record."
              : "This exception has been rejected by reviewer."}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 border-border border-t pt-3">
          <Button
            className={cn(
              isAiAccepted &&
                "bg-primary font-medium text-primary-foreground ring-2 ring-success/40 ring-offset-2 ring-offset-background hover:bg-primary/90"
            )}
            disabled={!exceptionId}
            onClick={() => setConfirmAction("approve")}
            size="sm"
          >
            <i
              aria-hidden="true"
              className="ri-checkbox-circle-line text-base"
            />
            {isAiAccepted ? "Approve with AI Fix" : "Approve exception"}
          </Button>
          <Button
            disabled={!exceptionId}
            onClick={() => setConfirmAction("reject")}
            size="sm"
            variant="destructive"
          >
            <i aria-hidden="true" className="ri-close-circle-line text-base" />
            Reject exception
          </Button>
        </div>
      )}

      <VerifyLoanSection allResolved={allResolved} loanId={loanId} />

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null);
          }
        }}
        open={confirmAction !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {getDialogTitle(confirmAction, isAiAccepted)}
            </DialogTitle>
            <DialogDescription>
              {getDialogDescription(confirmAction, isAiAccepted)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {confirmAction === "approve" ? (
              <div className="space-y-1.5">
                <Label htmlFor="corrected-value">
                  Corrected value (optional)
                </Label>
                <Input
                  id="corrected-value"
                  onChange={(event) => setCorrectedValue(event.target.value)}
                  placeholder="Final value to apply"
                  value={correctedValue}
                />
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setConfirmAction(null)}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                onClick={runConfirm}
                size="sm"
                variant={confirmAction === "reject" ? "destructive" : "default"}
              >
                {confirmLabel(
                  approve.isPending || reject.isPending,
                  confirmAction
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
