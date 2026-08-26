import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ExceptionListFilters } from "@/hooks/use-exceptions-filters";
import { exceptionsApi, summaryApi } from "@/lib/api";
import { mockApi, USE_MOCKS } from "@/lib/mocks";

export function useDashboardSummary() {
  return useQuery({
    queryFn: async () => {
      if (USE_MOCKS) {
        return mockApi.summary();
      }
      try {
        return await summaryApi.get();
      } catch {
        return mockApi.summary();
      }
    },
    queryKey: ["summary"],
  });
}

export function useExceptions(filters: ExceptionListFilters) {
  return useQuery({
    placeholderData: (previous) => previous,
    queryFn: async () => {
      if (USE_MOCKS) {
        return filterMockExceptions(filters);
      }
      try {
        return await exceptionsApi.list({ ...filters, limit: 50 });
      } catch {
        return filterMockExceptions(filters);
      }
    },
    queryKey: ["exceptions", filters],
  });
}

function filterMockExceptions(filters: ExceptionListFilters) {
  return mockApi.exceptions().then(({ data }) => ({
    data: data.filter((item) => {
      if (filters.status && item.status !== filters.status) {
        return false;
      }
      if (filters.severity && item.severity !== filters.severity) {
        return false;
      }
      if (filters.type && item.exceptionType !== filters.type) {
        return false;
      }
      if (filters.search) {
        const needle = filters.search.toLowerCase();
        const haystack =
          `${item.loan.loanId} ${item.loan.borrowerId}`.toLowerCase();
        if (!haystack.includes(needle)) {
          return false;
        }
      }
      return true;
    }),
    pagination: { limit: 50, page: 1, total: data.length, totalPages: 1 },
  }));
}

export function useAiDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      exceptionId: string;
      decision: "accepted" | "edited" | "rejected";
      editedValue?: string | null;
    }) => {
      if (USE_MOCKS) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return {
          aiDecision: input.decision,
          exceptionId: input.exceptionId,
          recordedAt: new Date().toISOString(),
        };
      }
      return exceptionsApi.recordAiDecision(input.exceptionId, {
        decision: input.decision,
        editedValue: input.editedValue ?? null,
      });
    },
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
    mutationFn: async (input: {
      id: string;
      note?: string;
      correctedValue?: string;
    }) => {
      if (USE_MOCKS) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { id: input.id, status: "approved" as const };
      }
      return exceptionsApi.approve(input.id, {
        correctedValue: input.correctedValue,
        note: input.note,
      });
    },
    onError: (error: Error) =>
      toast.error("Approve failed", { description: error.message }),
    onSuccess: (_data, variables) => invalidate(variables.id),
  });

  const reject = useMutation({
    mutationFn: async (input: { id: string; note: string }) => {
      if (USE_MOCKS) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { id: input.id, status: "rejected" as const };
      }
      return exceptionsApi.reject(input.id, input.note);
    },
    onError: (error: Error) =>
      toast.error("Reject failed", { description: error.message }),
    onSuccess: (_data, variables) => invalidate(variables.id),
  });

  return { approve, reject };
}
