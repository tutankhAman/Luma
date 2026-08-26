import type { Role } from "@repo/types";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
    <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col border-zinc-200/60 border-r bg-[#FAFAFA] p-4">
      <div className="mb-6 flex items-center gap-3 px-2">
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 font-bold text-sm text-white"
        >
          L
        </span>
        <span className="font-semibold text-zinc-900 tracking-tight">Luma</span>
        <Badge
          className="ml-auto rounded-full border border-zinc-200 bg-white px-2 py-0.5 font-medium text-[10px] text-zinc-600 uppercase tracking-widest shadow-sm"
          variant="ghost"
        >
          Premium
        </Badge>
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-1">
        {items.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 font-medium text-[13px] transition-all duration-200",
                isActive
                  ? "border border-zinc-200/50 bg-white text-zinc-900 shadow-sm"
                  : "border border-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
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

      <div className="mt-auto border-zinc-200/60 border-t pt-4">
        <div className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-zinc-100">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 font-semibold text-[10px] text-zinc-700 uppercase tracking-wider"
            >
              {user?.name?.slice(0, 2) ?? "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-xs text-zinc-900">
                {user?.name}
              </p>
              <p className="truncate text-[11px] text-zinc-500">
                {user ? ROLE_LABELS[user.role as Role] : ""}
              </p>
            </div>
          </div>
          <Button
            className="h-8 w-8 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900"
            disabled={signingOut}
            onClick={() => {
              void handleSignOut();
            }}
            size="icon"
            title={signingOut ? "Signing out..." : "Sign out"}
            variant="ghost"
          >
            <i aria-hidden="true" className="ri-logout-box-r-line text-base" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
