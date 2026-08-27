import type { Role } from "@repo/types";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";

const ROLE_HOME: Record<Role, string> = {
  data_consumer: "/consumer/dashboard",
  data_operator: "/operator/dashboard",
  reviewer: "/reviewer/dashboard",
};

export function RoleRedirect() {
  const { isPending, user } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Skeleton className="h-10 w-56" />
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

const STEPS = [
  { description: "Create your operator account", title: "Create an account" },
  {
    description: "Upload tapes and resolve exceptions",
    title: "Start verifying loans",
  },
];

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
    <div>
      <label
        className="mb-2 block text-[12px] text-muted-foreground"
        htmlFor={id}
      >
        {label}
      </label>
      <input
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-[14px] transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
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

function submitLabel(submitting: boolean, mode: "signin" | "register"): string {
  if (submitting) {
    return "Please wait...";
  }
  if (mode === "register") {
    return "Create account";
  }
  return "Sign in";
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

  return (
    <div className="flex min-h-screen gap-4 bg-background p-4 font-sans">
      <section className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden rounded-[32px] bg-foreground pt-40 pr-12 pb-12 pl-12 text-background lg:flex">
        <div className="mb-10 flex items-center gap-2 font-medium text-background">
          <span
            aria-hidden="true"
            className="size-5 rounded-full border border-white"
          />
          Luma
        </div>
        <h1 className="mb-3 text-center font-semibold text-[32px] text-background tracking-tight">
          Loan data verification,
          <br />
          made trustworthy
        </h1>
        <p className="mb-12 max-w-[280px] text-center text-[15px] text-muted-foreground leading-snug">
          Turn messy loan tapes into validated, traceable records with AI
          assistance at every step.
        </p>
        <ol className="w-full max-w-[340px] space-y-3">
          {STEPS.map((step, index) => {
            const active = index === 0;
            return (
              <li
                className={`flex items-center gap-4 rounded-xl p-4 ${
                  active
                    ? "bg-background font-medium text-foreground"
                    : "bg-muted/70 text-muted-foreground"
                } text-[14px]`}
                key={step.title}
              >
                <span
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] ${
                    active
                      ? "bg-foreground text-background"
                      : "border border-muted-foreground/50"
                  }`}
                >
                  {index + 1}
                </span>
                <span>
                  <span className="block">{step.title}</span>
                  <span
                    className={`block text-[12px] ${active ? "text-background/70" : "text-muted-foreground/70"}`}
                  >
                    {step.description}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="flex w-full flex-col items-center justify-center bg-card lg:w-1/2">
        <div className="w-full max-w-[380px]">
          <h2 className="mb-1.5 font-semibold text-[22px]">
            {mode === "register" ? "Create your account" : "Welcome back"}
          </h2>
          <p className="mb-8 text-[13px] text-muted-foreground">
            {mode === "register"
              ? "Start turning messy loan data into trusted records."
              : "Sign in to continue to Luma Copilot."}
          </p>

          <form
            className="space-y-4"
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
              <span className="mt-2 block text-[12px] text-muted-foreground">
                {mode === "register"
                  ? "Must be at least 8 characters."
                  : "Demo accounts: operator / reviewer / consumer @luma.dev"}
              </span>
            </div>

            <button
              className="mt-8 w-full rounded-xl bg-primary py-3 font-medium text-[14px] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitLabel(submitting, mode)}{" "}
            </button>
          </form>

          <p className="mt-8 text-center text-[13px] text-muted-foreground">
            {mode === "register"
              ? "Already have an account?"
              : "Don't have an account?"}
            <button
              className="ml-1 font-medium text-primary hover:underline"
              onClick={() =>
                setMode(mode === "register" ? "signin" : "register")
              }
              type="button"
            >
              {mode === "register" ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
