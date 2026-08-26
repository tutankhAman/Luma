import type { ReactNode } from "react";
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
  trendClassName = "text-emerald-400",
}: StatCardProps) {
  return (
    <div className="rounded-[24px] border border-[#27272A] bg-[#18181B] p-6 shadow-2xl">
      <div className="flex items-center gap-3">
        {icon ? (
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#8B5CF6]/30 bg-[#2E1065]/30 text-[#8B5CF6] text-base"
          >
            <i className={icon} />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-[#A1A1AA] text-xs">{label}</p>
          <p className="font-semibold text-white text-xl tabular-nums">
            {value}
          </p>
          {trend ? (
            <p className={cn("truncate font-medium text-xs", trendClassName)}>
              {trend}
            </p>
          ) : null}
          {hint ? (
            <p className="truncate text-[#A1A1AA]/70 text-xs">{hint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
