import { useQuery } from "@tanstack/react-query";
import { verifiedLoansApi } from "@/lib/api";
import { mockApi, USE_MOCKS } from "@/lib/mocks";

export function useVerifiedLoans(page = 1, search = "") {
  return useQuery({
    queryFn: () => {
      if (USE_MOCKS) {
        return mockApi.verifiedLoans();
      }
      return verifiedLoansApi.list({ limit: 20, page, search });
    },
    queryKey: ["verified-loans", page, search],
  });
}
