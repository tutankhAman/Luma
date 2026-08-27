import type { Role } from "@repo/types";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/* Spec §8 — sidebar nav scoped by role, plus the pinned AI Development Log. */

const ROLE_LABELS: Record<Role, string> = {
  data_consumer: "Data Consumer",
  data_operator: "Data Operator",
  reviewer: "Reviewer",
};

const ROLE_HOME: Record<Role, string> = {
  data_consumer: "/consumer/dashboard",
  data_operator: "/operator/dashboard",
  reviewer: "/reviewer/dashboard",
};

/* Demo credential mapping — the role switcher re-authenticates as the seeded
   user for the selected role so the 5-minute demo can move between roles fast. */
const ROLE_DEMO_EMAIL: Record<Role, string> = {
  data_consumer: "consumer@luma.dev",
  data_operator: "operator@luma.dev",
  reviewer: "reviewer@luma.dev",
};

interface NavItem {
  href: string;
  icon: string;
  label: string;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/operator/dashboard",
    icon: "ri-dashboard-2-line",
    label: "Dashboard",
    roles: ["data_operator"],
  },
  {
    href: "/operator/upload",
    icon: "ri-upload-cloud-2-line",
    label: "Upload Data",
    roles: ["data_operator"],
  },
  {
    href: "/operator/imports",
    icon: "ri-archive-drawer-line",
    label: "Import History",
    roles: ["data_operator"],
  },
  {
    href: "/operator/loans",
    icon: "ri-database-2-line",
    label: "Loan Records",
    roles: ["data_operator"],
  },
  {
    href: "/reviewer/dashboard",
    icon: "ri-dashboard-2-line",
    label: "Dashboard",
    roles: ["reviewer"],
  },
  {
    href: "/reviewer/exceptions",
    icon: "ri-error-warning-line",
    label: "Exception Queue",
    roles: ["reviewer"],
  },
  {
    href: "/reviewer/rules",
    icon: "ri-braces-line",
    label: "Rule Builder",
    roles: ["reviewer"],
  },
  {
    href: "/consumer/dashboard",
    icon: "ri-dashboard-2-line",
    label: "Dashboard",
    roles: ["data_consumer"],
  },
  {
    href: "/consumer/verified",
    icon: "ri-shield-check-line",
    label: "Verified Records",
    roles: ["data_consumer"],
  },
  {
    href: "/consumer/audit",
    icon: "ri-history-line",
    label: "Audit Trail",
    roles: ["data_consumer"],
  },
  {
    href: "/consumer/api",
    icon: "ri-terminal-box-line",
    label: "API Explorer",
    roles: ["data_consumer"],
  },
];

function Wordmark() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <img
        alt="Luma"
        className="size-6 shrink-0 rounded-[9px]"
        height={24}
        src="/luma.svg"
        width={24}
      />
      <p className="font-bold text-xl tracking-tight">Luma</p>
    </div>
  );
}

function RoleSwitcher({ current }: { current: Role }) {
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);

  const handleSwitch = async (role: Role) => {
    if (role === current) {
      return;
    }
    setSwitching(true);
    try {
      const { error } = await authClient.signIn.email({
        email: ROLE_DEMO_EMAIL[role],
        password: "password",
      });
      if (error) {
        toast.error("Role switch failed", { description: error.message });
        return;
      }
      navigate(ROLE_HOME[role], { replace: true });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <Select
      disabled={switching}
      onValueChange={(value) => {
        void handleSwitch(value as Role);
      }}
      value={current}
    >
      <SelectTrigger
        aria-label="Switch role"
        className="w-full justify-between gap-2 rounded-lg border-border bg-card px-2.5 data-[size=sm]:h-8"
        size="sm"
      >
        <span className="flex min-w-0 items-center gap-2">
          <i
            aria-hidden="true"
            className="ri-user-settings-line text-[13px] text-muted-foreground"
          />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent align="start">
        {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
          <SelectItem
            className="data-[highlighted]:text-accent-foreground"
            key={role}
            value={role}
          >
            {ROLE_LABELS[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Sidebar() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const role = (user?.role as Role | undefined) ?? null;
  const items = NAV_ITEMS.filter((item) =>
    role ? item.roles.includes(role) : false
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
      navigate("/login");
    } catch {
      toast.error("Sign out failed");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <aside className="flex h-screen min-h-0 w-[248px] shrink-0 flex-col border-sidebar-border border-r bg-sidebar">
      <div className="px-5 pt-5 pb-4">
        <Wordmark />
      </div>

      {role ? (
        <div className="px-4 pb-1">
          <p className="mb-1.5 font-medium text-[10px] text-muted-foreground uppercase tracking-widest">
            Viewing as
          </p>
          <RoleSwitcher current={role} />
        </div>
      ) : null}

      <nav
        aria-label="Primary"
        className="mt-3 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4"
      >
        {items.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] transition-colors",
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
            end={true}
            key={item.href}
            to={item.href}
          >
            <i
              aria-hidden="true"
              className={cn(
                item.icon,
                "text-[15px]",
                "group-aria-[current=page]:text-inherit"
              )}
            />
            {item.label}
          </NavLink>
        ))}

        <Separator className="my-3 opacity-70" />

        <NavLink
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] transition-colors",
              isActive
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )
          }
          to="/ai-log"
        >
          <i aria-hidden="true" className="ri-sparkling-2-line text-[15px]" />
          AI Development Log
        </NavLink>
      </nav>

      <div className="border-sidebar-border border-t p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card font-semibold text-[11px] text-muted-foreground uppercase"
          >
            {user?.name?.slice(0, 2) ?? "??"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[13px]">{user?.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {role ? ROLE_LABELS[role] : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="flex-1 rounded-md px-2 py-1.5 text-left text-muted-foreground text-xs transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => navigate("/login")}
            type="button"
          >
            Test Credentials
          </button>
          <button
            className="flex-1 rounded-md px-2 py-1.5 text-right text-muted-foreground text-xs transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            disabled={signingOut}
            onClick={() => {
              void handleSignOut();
            }}
            type="button"
          >
            {signingOut ? "Signing out…" : "Logout"}
          </button>
        </div>
      </div>
    </aside>
  );
}
