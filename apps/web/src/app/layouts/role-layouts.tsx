import type { Role } from "@repo/types";
import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/app/guards/ProtectedRoute";
import { CopilotPanel } from "@/components/ai/copilot-panel";
import { Sidebar } from "@/components/nav/sidebar";
import { cn } from "@/lib/utils";

function RoleShell({
  requiredRole,
  withCopilot = false,
}: {
  requiredRole: Role;
  withCopilot?: boolean;
}) {
  return (
    <ProtectedRoute role={requiredRole}>
      <div
        className={cn(
          "grid h-screen grid-cols-[240px_1fr] overflow-hidden bg-[#FAFAFA]",
          withCopilot && "xl:grid-cols-[240px_1fr_320px]"
        )}
      >
        <Sidebar />
        <main className="overflow-y-auto">
          <Outlet />
        </main>
        {withCopilot ? <CopilotPanel /> : null}
      </div>
    </ProtectedRoute>
  );
}

export function OperatorLayout() {
  return <RoleShell requiredRole="data_operator" withCopilot={true} />;
}

export function ReviewerLayout() {
  return <RoleShell requiredRole="reviewer" />;
}

export function ConsumerLayout() {
  return <RoleShell requiredRole="data_consumer" />;
}
