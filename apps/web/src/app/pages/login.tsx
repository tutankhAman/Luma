import type { Role } from "@repo/types";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";

const ROLE_HOME: Record<Role, string> = {
  data_consumer: "/consumer/dashboard",
  data_operator: "/operator/dashboard",
  reviewer: "/reviewer/dashboard",
};

const DEMO_ACCOUNTS = [
  { email: "operator@luma.dev", label: "Operator", role: "data_operator" },
  { email: "reviewer@luma.dev", label: "Reviewer", role: "reviewer" },
  { email: "consumer@luma.dev", label: "Consumer", role: "data_consumer" },
];

export function RoleRedirect() {
  const { isPending, user } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Skeleton className="h-10 w-56 rounded-full" />
      </div>
    );
  }
  if (!user) {
    return <Navigate replace to="/login" />;
  }
  const normalized = (() => {
    const r = user.role as string;
    if (r === "data_operator" || r === "reviewer" || r === "data_consumer") {
      return r as Role;
    }
    return null;
  })();
  if (!normalized) {
    return <Navigate replace to="/login" />;
  }
  return <Navigate replace to={ROLE_HOME[normalized]} />;
}

function AuthInput({
  autoComplete,
  id,
  label,
  onChange,
  placeholder,
  type,
  value,
}: {
  autoComplete?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type: string;
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        className="block font-medium text-[12px] text-foreground"
        htmlFor={id}
      >
        {label}
      </label>
      <input
        autoComplete={autoComplete}
        className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-[13.5px] outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={true}
        type={type}
        value={value}
      />
    </div>
  );
}

function getSubmitButtonContent(
  submitting: boolean,
  mode: "signin" | "register"
) {
  if (submitting) {
    return (
      <>
        <i
          aria-hidden="true"
          className="ri-loader-4-line animate-spin text-sm"
        />
        Please wait…
      </>
    );
  }
  return mode === "register" ? "Create account" : "Sign in";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigateByRole = async () => {
    const session = await authClient.getSession();
    const role = (session?.data?.user as { role?: string } | undefined)?.role;
    const normalized: Role | null =
      role === "data_operator" ||
      role === "reviewer" ||
      role === "data_consumer"
        ? (role as Role)
        : null;
    if (!normalized) {
      navigate("/login", { replace: true });
      return;
    }
    navigate(ROLE_HOME[normalized], { replace: true });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "register") {
        const { error } = await authClient.signUp.email({
          email,
          name,
          password,
        });
        if (error) {
          toast.error("Sign up failed", { description: error.message });
          return;
        }
        await authClient.signIn.email({ email, password });
      } else {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) {
          toast.error("Invalid credentials", {
            description: "Check your email and password, then try again.",
          });
          return;
        }
      }
      await navigateByRole();
    } catch {
      toast.error("Authentication failed", {
        description: "Could not reach the auth server. Is the API running?",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    toast.success(`Demo credentials filled for ${demoEmail}`);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans">
      {/* Left: Container with 2xl rounded corners taking half the width */}
      <section className="relative hidden h-full w-1/2 p-2 sm:p-2.5 lg:block">
        <div className="relative size-full overflow-hidden rounded-2xl border border-border bg-muted shadow-xs">
          <img
            alt="Luma Verification Platform"
            className="size-full object-cover object-center"
            height={3840}
            src="/login-bg.webp"
            width={2160}
          />
          {/* Bottom Glassmorphic Info Pane */}
          <div className="absolute inset-x-3.5 bottom-3.5 rounded-xl border border-white/15 bg-black/45 p-4 text-white shadow-xl backdrop-blur-md">
            <div className="mb-1 flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-[13px] tracking-tight">
                Loan Tape Verification
              </span>
            </div>
            <p className="max-w-[480px] text-[12px] text-white/80 leading-relaxed">
              Ingest multi-source tapes, resolve data discrepancies with rule
              checks, and export verified mortgage records with cryptographic
              seals.
            </p>
          </div>
        </div>
      </section>

      {/* Right: Auth Form Section */}
      <section className="flex h-full w-full flex-col justify-between overflow-y-auto p-6 sm:p-8 lg:w-1/2">
        {/* Header Branding */}
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground text-xs shadow-xs"
          >
            L
          </span>
          <span className="font-semibold text-base tracking-tight">Luma</span>
        </div>

        {/* Form Container */}
        <div className="mx-auto my-auto w-full max-w-[380px] py-2">
          <div className="mb-6 space-y-1.5">
            <h1 className="font-semibold text-[24px] text-foreground tracking-tight">
              {mode === "register" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-[13px] text-muted-foreground">
              {mode === "register"
                ? "Start turning unverified loan tapes into verified assets."
                : "Sign in to access loan ingestion, review, and verification."}
            </p>
          </div>

          {/* Quick Demo Selector */}
          {mode === "signin" ? (
            <div className="mb-5 rounded-xl border border-border bg-muted/30 p-3">
              <p className="mb-2 font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
                Quick Demo Accounts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    className="rounded-full border border-border/80 bg-background px-3 py-1 font-medium text-[11.5px] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 active:scale-95"
                    key={acc.email}
                    onClick={() => fillDemoAccount(acc.email)}
                    type="button"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <form
            className="space-y-3.5"
            onSubmit={(event) => void handleSubmit(event)}
          >
            {mode === "register" ? (
              <AuthInput
                autoComplete="name"
                id="name"
                label="Full name"
                onChange={setName}
                placeholder="Jane Operator"
                type="text"
                value={name}
              />
            ) : null}
            <AuthInput
              autoComplete="email"
              id="email"
              label="Email address"
              onChange={setEmail}
              placeholder="operator@luma.dev"
              type="email"
              value={email}
            />
            <div>
              <AuthInput
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                id="password"
                label="Password"
                onChange={setPassword}
                placeholder="••••••••"
                type="password"
                value={password}
              />
              {mode === "register" ? (
                <span className="mt-1.5 block text-[11.5px] text-muted-foreground">
                  Must be at least 8 characters.
                </span>
              ) : null}
            </div>

            <Button
              className="mt-2 h-10 w-full rounded-full text-[13.5px]"
              disabled={submitting}
              type="submit"
            >
              {getSubmitButtonContent(submitting, mode)}
            </Button>
          </form>

          <div className="mt-6 text-center text-[12.5px] text-muted-foreground">
            {mode === "register"
              ? "Already have an account?"
              : "Don't have an account?"}
            <button
              className="ml-1.5 font-medium text-primary hover:underline"
              onClick={() =>
                setMode(mode === "register" ? "signin" : "register")
              }
              type="button"
            >
              {mode === "register" ? "Sign in" : "Create one"}
            </button>
          </div>
        </div>

        {/* Footer Copyright / Status */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
          <span>© 2026 Luma Systems</span>
          <span>Cryptographic Verification Pipeline</span>
        </div>
      </section>
    </div>
  );
}
