import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  className?: string;
  hint?: string;
  icon?: string;
  label: string;
  value: ReactNode;
}

export function StatCard({
  className,
  icon,
  label,
  value,
  hint,
}: StatCardProps) {
  return (
    <Card className={cn("py-4", className)}>
      <CardContent className="flex items-center gap-3 px-4">
        {icon ? (
          <span
            aria-hidden="true"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted",
              "text-base"
            )}
          >
            <i className={icon} />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-muted-foreground text-xs">{label}</p>
          <p className="font-semibold text-xl tabular-nums">{value}</p>
          {hint ? (
            <p className="truncate text-muted-foreground text-xs">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
