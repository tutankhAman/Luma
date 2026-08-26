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
    <Card className="relative overflow-hidden rounded-2xl border-zinc-200/60 bg-white p-5 shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.03),0px_4px_8px_-2px_rgba(0,0,0,0.02)] transition-all duration-300 ease-out hover:-translate-y-[2px] hover:shadow-[0px_8px_16px_-4px_rgba(0,0,0,0.05)]">
      <CardContent className="flex flex-col gap-1 p-0">
        <div className="flex items-center justify-between">
          <p className="truncate font-medium text-sm text-zinc-500">{label}</p>
          {icon ? (
            <span
              aria-hidden="true"
              className={cn(
                "flex size-5 items-center justify-center text-zinc-400"
              )}
            >
              <i className={icon} />
            </span>
          ) : null}
        </div>
        <p className="mt-1 font-semibold text-3xl text-zinc-900 tabular-nums tracking-tighter">
          {value}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {trend ? (
            <p className={cn("truncate font-medium text-xs", trendClassName)}>
              {trend}
            </p>
          ) : null}
          {hint ? (
            <p className="truncate text-xs text-zinc-400">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
