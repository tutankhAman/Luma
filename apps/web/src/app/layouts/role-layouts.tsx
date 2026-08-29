import type { Role } from "@repo/types";
import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/app/guards/ProtectedRoute";
import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";
import { useSession } from "@/hooks/use-session";

const PAGE_TITLES: Record<Role, string> = {
  data_consumer: "Data Consumer",
  data_operator: "Data Operator",
  reviewer: "Reviewer",
};

function RoleShell({ requiredRole }: { requiredRole: Role }) {
  return (
    <ProtectedRoute role={requiredRole}>
      <div className="grid h-screen min-h-screen grid-cols-[248px_1fr] overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-col">
          <Topbar title={PAGE_TITLES[requiredRole]} />
          <main className="custom-scrollbar-hide min-h-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export function OperatorLayout() {
  return <RoleShell requiredRole="data_operator" />;
}

export function ReviewerLayout() {
  return <RoleShell requiredRole="reviewer" />;
}

export function ConsumerLayout() {
  return <RoleShell requiredRole="data_consumer" />;
}

export function SharedDocLayout() {
  const { user } = useSession();
  const role = (user?.role as Role | undefined) ?? "data_operator";
  const title = PAGE_TITLES[role] ?? "Luma";

  return (
    <ProtectedRoute>
      <div className="grid h-screen min-h-screen grid-cols-[248px_1fr] overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-col">
          <Topbar title={title} />
          <main className="custom-scrollbar-hide min-h-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
