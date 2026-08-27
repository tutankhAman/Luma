import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { aiApi, exceptionsApi } from "@/lib/api";

export function useExplainException() {
  return useMutation({
    mutationFn: (exceptionId: string) => aiApi.explain(exceptionId),
    onError: (error: Error) => {
      toast.error("AI unavailable", {
        description:
          error instanceof Error
            ? error.message
            : "Proceed with manual review.",
      });
    },
  });
}

export function useAiDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      editedValue?: string | null;
      exceptionId: string;
      decision: "accepted" | "edited" | "rejected";
    }) =>
      exceptionsApi.recordAiDecision(input.exceptionId, {
        decision: input.decision,
        editedValue: input.editedValue ?? null,
      }),
    onError: (error: Error) => {
      toast.error("Could not record decision", { description: error.message });
    },
    onSuccess: (result) => {
      toast.success(`AI suggestion ${result.aiDecision}`);
      void queryClient.invalidateQueries({ queryKey: ["exceptions"] });
      void queryClient.invalidateQueries({
        queryKey: ["exception", result.exceptionId],
      });
    },
  });
}

export function useSummarizeBatch() {
  return useMutation({
    mutationFn: (batchId: string) => aiApi.summarizeBatch(batchId),
    onError: (error: Error) => {
      toast.error("AI summary unavailable", {
        description:
          error instanceof Error
            ? error.message
            : "Could not generate summary.",
      });
    },
  });
}

export function useDraftNote() {
  return useMutation({
    mutationFn: (exceptionId: string) => aiApi.draftNote(exceptionId),
    onError: (error: Error) => {
      toast.error("Note drafting unavailable", { description: error.message });
    },
    onSuccess: (result) => {
      if (result.note) {
        toast.success("Reviewer note drafted — edit before saving");
      }
    },
  });
}
