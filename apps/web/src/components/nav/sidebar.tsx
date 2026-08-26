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
    <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-slate-100 border-r bg-white p-4">
      <div className="mb-6 flex items-center gap-2 px-1">
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-sm text-white"
        >
          L
        </span>
        <span className="font-semibold text-slate-900">Luma</span>
        <Badge
          className="ml-auto rounded-full bg-slate-100 text-slate-500"
          variant="ghost"
        >
          Copilot
        </Badge>
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-1">
        {items.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-indigo-50 font-medium text-indigo-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
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

      <div className="border-slate-100 border-t pt-4">
        <div className="mb-3 flex items-center gap-2.5 px-1">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-xs uppercase"
          >
            {user?.name?.slice(0, 2) ?? "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900 text-sm">
              {user?.name}
            </p>
            <p className="truncate text-slate-500 text-xs">
              {user ? ROLE_LABELS[user.role as Role] : ""}
            </p>
          </div>
        </div>
        <Button
          className="w-full justify-start text-slate-500 hover:text-slate-900"
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
