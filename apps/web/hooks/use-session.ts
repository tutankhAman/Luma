import { authClient } from "@/lib/auth-client";

export interface UseSessionReturn {
  data: { session: unknown; user: unknown } | null;
  error: unknown;
  isPending: boolean;
  isRefetching: boolean;
  refetch: () => Promise<void>;
  session: unknown | null;
  user: { id: string; email: string; name: string; role: string } | null;
}

export function useSession(): UseSessionReturn {
  const result = authClient.useSession() as unknown as {
    data: {
      session: unknown;
      user: { id: string; email: string; name: string; role: string } | null;
    } | null;
    error: unknown;
    isPending: boolean;
    isRefetching: boolean;
    refetch: () => Promise<void>;
  };
  return {
    data: result.data as unknown as { session: unknown; user: unknown } | null,
    error: result.error,
    isPending: result.isPending,
    isRefetching: result.isRefetching,
    refetch: result.refetch,
    session:
      (result.data as unknown as { session: unknown } | null)?.session ?? null,
    user: result.data?.user ?? null,
  };
}
