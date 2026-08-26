import { useQuery } from "@tanstack/react-query";
import { verifiedLoansApi } from "@/lib/api";
import { mockApi, USE_MOCKS } from "@/lib/mocks";

export function useVerifiedLoans(page = 1, search = "") {
  return useQuery({
    queryFn: async () => {
      if (USE_MOCKS) {
        return mockApi.verifiedLoans();
      }
      try {
        return await verifiedLoansApi.list({ limit: 20, page, search });
      } catch {
        return mockApi.verifiedLoans();
      }
    },
    queryKey: ["verified-loans", page, search],
  });
}
