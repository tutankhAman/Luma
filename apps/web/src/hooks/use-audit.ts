import { useQuery } from "@tanstack/react-query";
import { auditApi } from "@/lib/api";
import { mockApi, USE_MOCKS } from "@/lib/mocks";

export function useAuditTrail(loanId: string, page = 1) {
  return useQuery({
    enabled: Boolean(loanId),
    queryFn: () =>
      USE_MOCKS
        ? mockApi.auditTrail(loanId)
        : auditApi.trail(loanId, { limit: 50, page }),
    queryKey: ["audit", loanId, page],
  });
}
