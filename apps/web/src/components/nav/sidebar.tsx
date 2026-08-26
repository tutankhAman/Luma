import type { Role } from "@repo/types";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

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
    href: "/consumer/dashboard",
    icon: "ri-database-2-line",
    label: "Verified Records",
    roles: ["data_consumer"],
  },
  {
    href: "/consumer/export",
    icon: "ri-download-2-line",
    label: "Export",
    roles: ["data_consumer"],
  },
];

const ROLE_LABELS: Record<Role, string> = {
  data_consumer: "Data Consumer",
  data_operator: "Data Operator",
  reviewer: "Reviewer",
};

export function Sidebar() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const items = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role as Role) : false
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
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground text-sm"
        >
          L
        </span>
        <span className="font-semibold">Luma</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[0.65rem] text-muted-foreground">
          Copilot
        </span>
      </div>

      <nav
        aria-label="Primary"
        className="flex-1 space-y-1 overflow-y-auto p-3"
      >
        {items.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
            end={true}
            key={item.href}
            to={item.href}
          >
            <i aria-hidden="true" className={cn(item.icon, "text-base")} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 flex items-center gap-2 px-1">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs uppercase"
          >
            {user?.name?.slice(0, 2) ?? "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">{user?.name}</p>
            <p className="truncate text-muted-foreground text-xs">
              {user ? ROLE_LABELS[user.role as Role] : ""}
            </p>
          </div>
        </div>
        <Button
          className="w-full justify-start"
          disabled={signingOut}
          onClick={() => {
            void handleSignOut();
          }}
          size="sm"
          variant="ghost"
        >
          <i aria-hidden="true" className="ri-logout-box-r-line text-base" />
          {signingOut ? "Signing out..." : "Sign out"}
        </Button>
      </div>
    </aside>
  );
}
