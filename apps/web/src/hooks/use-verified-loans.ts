import { useQuery } from "@tanstack/react-query";
import { verifiedLoansApi } from "@/lib/api";

export function useVerifiedLoans(page = 1, search = "") {
  return useQuery({
    queryFn: () => verifiedLoansApi.list({ limit: 20, page, search }),
    queryKey: ["verified-loans", page, search],
  });
}
