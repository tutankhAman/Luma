import type { LoanDetail, LoanFieldsPatchBody } from "@repo/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { loansApi } from "@/lib/api";

export function useLoan(id: string) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => loansApi.detail(id),
    queryKey: ["loan", id],
  });
}

export function useUpdateLoanFields(loanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LoanFieldsPatchBody) =>
      loansApi.patchFields(loanId, body),
    onError: (
      error: Error,
      _body,
      context: { previous: LoanDetail | null } | undefined
    ) => {
      if (context?.previous) {
        queryClient.setQueryData(["loan", loanId], context.previous);
      }
      toast.error("Field update failed", { description: error.message });
    },
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ["loan", loanId] });
      const previous = queryClient.getQueryData<LoanDetail>(["loan", loanId]);
      queryClient.setQueryData<LoanDetail>(["loan", loanId], (old) =>
        old ? { ...old, ...body.fields } : old
      );
      return { previous: previous ?? null };
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
      void queryClient.invalidateQueries({ queryKey: ["audit", loanId] });
    },
    onSuccess: (result) => {
      toast.success(`Updated: ${result.updatedFields.join(", ")}`);
    },
  });
}

export function useVerifyLoan(loanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => loansApi.verify(loanId),
    onError: (error: Error) => {
      toast.error("Verification failed", { description: error.message });
    },
    onSuccess: (result) => {
      toast.success("Loan verified", {
        description: `Record hash: ${result.verifiedLoan.recordHash.slice(0, 18)}…`,
      });
      void queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}
