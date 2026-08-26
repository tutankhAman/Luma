import type { Role } from "@repo/types";
import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/app/guards/ProtectedRoute";
import { Sidebar } from "@/components/nav/sidebar";

function RoleShell({ requiredRole }: { requiredRole: Role }) {
  return (
    <ProtectedRoute role={requiredRole}>
      <div className="grid h-screen min-h-screen grid-cols-[260px_1fr] overflow-hidden bg-black">
        <Sidebar />
        <main className="custom-scrollbar-hide flex-1 overflow-y-auto">
          <Outlet />
        </main>
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
