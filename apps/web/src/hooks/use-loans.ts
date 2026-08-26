import type { LoanDetail, LoanFieldsPatchBody } from "@repo/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { loansApi } from "@/lib/api";
import { mockApi, USE_MOCKS } from "@/lib/mocks";

export function useLoan(id: string) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => (USE_MOCKS ? mockApi.loanDetail(id) : loansApi.detail(id)),
    queryKey: ["loan", id],
  });
}

export function useUpdateLoanFields(loanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: LoanFieldsPatchBody) => {
      if (USE_MOCKS) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return {
          id: loanId,
          updatedAt: new Date().toISOString(),
          updatedFields: Object.keys(body.fields),
        } as const;
      }
      return loansApi.patchFields(loanId, body);
    },
    onError: (
      error: Error,
      _body,
      context: { previous: LoanDetail | undefined | null } | undefined
    ) => {
      if (context?.previous) {
        queryClient.setQueryData(["loan", loanId], context.previous);
      }
      toast.error("Field update failed", { description: error.message });
    },
    onMutate: async (
      body
    ): Promise<{ previous: LoanDetail | undefined | null }> => {
      await queryClient.cancelQueries({ queryKey: ["loan", loanId] });
      const previous = queryClient.getQueryData<LoanDetail>(["loan", loanId]);
      if (previous) {
        queryClient.setQueryData<LoanDetail>(["loan", loanId], {
          ...previous,
          ...body.fields,
        });
      }
      return { previous };
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
    mutationFn: async () => {
      if (USE_MOCKS) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        return {
          verifiedLoan: {
            id: "clx_vl_new",
            loanId,
            recordHash:
              "b6c8e1f2a3d405162738495a6b7c8d9e0f1a2b3c4d5e6f708192a3b4c5d6e7f8",
            validationResult: "passed_with_review" as const,
            verifiedAt: new Date().toISOString(),
            verifiedById: "clx_user_reviewer",
          },
        };
      }
      return loansApi.verify(loanId);
    },
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
