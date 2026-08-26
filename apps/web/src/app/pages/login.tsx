import type { Role } from "@repo/types";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";

const ROLE_HOME: Record<Role, string> = {
  data_consumer: "/consumer/dashboard",
  data_operator: "/operator/dashboard",
  reviewer: "/reviewer/dashboard",
};

export function roleHome(role: string): string {
  return ROLE_HOME[role as Role] ?? "/login";
}

export function RoleRedirect() {
  const { isPending, user } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-10 w-56" />
      </div>
    );
  }
  if (!user) {
    return <Navigate replace to="/login" />;
  }
  return <Navigate replace to={roleHome(user.role)} />;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        toast.error("Invalid credentials", {
          description: "Check your email and password, then try again.",
        });
        return;
      }
      const session = await authClient.getSession();
      const rawRole = (session?.data?.user as { role?: string } | undefined)
        ?.role;
      navigate(roleHome(rawRole ?? "data_consumer"), { replace: true });
    } catch {
      toast.error("Sign in failed", {
        description: "Could not reach the auth server. Is the API running?",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <span
            aria-hidden="true"
            className="mx-auto mb-1 flex size-10 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground"
          >
            L
          </span>
          <CardTitle className="font-heading text-xl">Luma Copilot</CardTitle>
          <CardDescription>
            Loan Data Verification — sign in to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                autoComplete="email"
                id="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@luma.dev"
                required={true}
                type="email"
                value={email}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                autoComplete="current-password"
                id="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required={true}
                type="password"
                value={password}
              />
            </div>
            <Button className="w-full" disabled={submitting} type="submit">
              {submitting ? (
                <>
                  <i
                    aria-hidden="true"
                    className="ri-loader-4-line animate-spin text-base"
                  />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
          <p className="mt-4 text-center text-muted-foreground text-xs">
            Demo accounts: operator / reviewer / consumer @luma.dev · password
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
