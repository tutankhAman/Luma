import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ExceptionListFilters } from "@/hooks/use-exceptions-filters";
import { exceptionsApi, summaryApi } from "@/lib/api";

export function useDashboardSummary() {
  return useQuery({
    queryFn: () => summaryApi.get(),
    queryKey: ["summary"],
  });
}

export function useExceptions(filters: ExceptionListFilters) {
  return useQuery({
    placeholderData: (previous) => previous,
    queryFn: () =>
      exceptionsApi.list({
        ...filters,
        batchId: filters.batchId || undefined,
        limit: 20,
        search: filters.search || undefined,
        severity: filters.severity || undefined,
        status: filters.status || undefined,
        type: filters.type || undefined,
      }),
    queryKey: ["exceptions", filters],
  });
}

export function useException(id: string) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => exceptionsApi.detail(id),
    queryKey: ["exception", id],
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { exceptionId: string; note: string }) =>
      exceptionsApi.comment(input.exceptionId, { note: input.note }),
    onError: (error: Error) => {
      toast.error("Could not add note", { description: error.message });
    },
    onSuccess: (_data, variables) => {
      toast.success("Note added");
      void queryClient.invalidateQueries({
        queryKey: ["exception", variables.exceptionId],
      });
    },
  });
}

export function useExceptionReview() {
  const queryClient = useQueryClient();
  const invalidate = (exceptionId: string) => {
    void queryClient.invalidateQueries({ queryKey: ["exceptions"] });
    void queryClient.invalidateQueries({
      queryKey: ["exception", exceptionId],
    });
    void queryClient.invalidateQueries({ queryKey: ["summary"] });
  };

  const approve = useMutation({
    mutationFn: (input: {
      id: string;
      note?: string;
      correctedValue?: string;
    }) =>
      exceptionsApi.approve(input.id, {
        correctedValue: input.correctedValue,
        note: input.note,
      }),
    onError: (error: Error) =>
      toast.error("Approve failed", { description: error.message }),
    onSuccess: (_data, variables) => invalidate(variables.id),
  });

  const reject = useMutation({
    mutationFn: (input: { id: string; note: string }) =>
      exceptionsApi.reject(input.id, input.note),
    onError: (error: Error) =>
      toast.error("Reject failed", { description: error.message }),
    onSuccess: (_data, variables) => invalidate(variables.id),
  });

  return { approve, reject };
}
