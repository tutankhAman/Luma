import type { Role } from "@repo/types";
import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/app/guards/ProtectedRoute";
import { Sidebar } from "@/components/nav/sidebar";

function RoleShell({
  children,
  requiredRole,
}: {
  children?: ReactNode;
  requiredRole: Role;
}) {
  return (
    <ProtectedRoute role={requiredRole}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children ?? <Outlet />}</main>
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
