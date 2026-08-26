import { useQuery } from "@tanstack/react-query";
import { auditApi } from "@/lib/api";

export function useAuditTrail(loanId: string, page = 1) {
  return useQuery({
    enabled: Boolean(loanId),
    queryFn: () => auditApi.trail(loanId, { limit: 50, page }),
    queryKey: ["audit", loanId, page],
  });
}
