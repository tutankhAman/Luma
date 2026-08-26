import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  hint?: string;
  icon?: string;
  label: string;
  trend?: ReactNode;
  trendClassName?: string;
  value: ReactNode;
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  trend,
  trendClassName = "text-emerald-600",
}: StatCardProps) {
  return (
    <Card className="rounded-xl border-slate-100 bg-white py-4 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
      <CardContent className="flex items-center gap-3 px-4">
        {icon ? (
          <span
            aria-hidden="true"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-base text-indigo-600"
            )}
          >
            <i className={icon} />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-slate-500 text-xs">{label}</p>
          <p className="font-semibold text-slate-900 text-xl tabular-nums">
            {value}
          </p>
          {trend ? (
            <p className={cn("truncate font-medium text-xs", trendClassName)}>
              {trend}
            </p>
          ) : null}
          {hint ? (
            <p className="truncate text-muted-foreground text-xs">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
