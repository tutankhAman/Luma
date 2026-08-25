import type { Role } from "@repo/types";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: Role | Role[];
  roles?: Role | Role[];
}

function normalizeRoles(
  role?: Role | Role[],
  roles?: Role | Role[]
): Role[] | null {
  const raw = roles ?? role;
  if (!raw) {
    return null;
  }
  return Array.isArray(raw) ? raw : [raw];
}

export function Forbidden({ requiredRole }: { requiredRole?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <i aria-hidden="true" className="ri-lock-line text-lg" />
            Forbidden
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            You do not have permission to view this page
            {requiredRole ? ` (requires ${requiredRole})` : ""}. The API will
            return 403 for any data request.
          </p>
          <Button
            onClick={() => {
              window.location.assign("/login");
            }}
            variant="outline"
          >
            <i aria-hidden="true" className="ri-login-box-line mr-2" />
            Go to login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProtectedRoute({ children, role, roles }: ProtectedRouteProps) {
  const { user, isPending } = useSession();
  const allowedRoles = normalizeRoles(role, roles);

  if (isPending) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role as Role)) {
    return <Forbidden requiredRole={allowedRoles.join(" or ")} />;
  }

  return <>{children}</>;
}
