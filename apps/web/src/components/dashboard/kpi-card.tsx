import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Spec §3 — KPICard: big number + small-caps label + optional delta chip. */

export interface KpiCardProps {
  delta?: string | null;
  deltaTone?: "negative" | "neutral" | "positive";
  icon: string;
  label: string;
  loading?: boolean;
  value: ReactNode;
}

const DELTA_TONES = {
  negative: "text-destructive",
  neutral: "text-muted-foreground",
  positive: "text-success",
} as const;

export function KpiCard({
  delta,
  deltaTone = "neutral",
  icon,
  label,
  loading = false,
  value,
}: KpiCardProps) {
  return (
    <div>
      <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.08em]">
        {label}
      </p>
      {loading ? (
        <div className="mt-2.5 h-8 w-16 animate-pulse rounded-md bg-muted" />
      ) : (
        <div className="mt-2 flex items-center gap-2.5">
          <p className="font-semibold text-[28px] tabular-nums leading-none tracking-tight">
            {value}
          </p>
          <i
            aria-hidden="true"
            className={cn(icon, "text-[20px] text-muted-foreground")}
          />
        </div>
      )}
      {delta ? (
        <p
          className={cn("mt-2 font-medium text-[12px]", DELTA_TONES[deltaTone])}
        >
          {delta}
        </p>
      ) : null}
    </div>
  );
}

export function KpiStrip({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 border-border border-y",
        "[&>*]:border-border/60 [&>*]:py-5 [&>*]:pr-5",
        "max-sm:[&>*+*]:border-t",
        "sm:grid-cols-2",
        "sm:[&>*:nth-child(even)]:border-l",
        "sm:[&>*:nth-child(even)]:pl-5",
        "sm:[&>*:nth-child(n+3)]:border-t",
        "xl:grid-cols-4",
        "xl:[&>*:nth-child(n+2)]:border-l",
        "xl:[&>*:nth-child(n+2)]:pl-5",
        "xl:[&>*:nth-child(n+3)]:border-t-0"
      )}
    >
      {children}
    </div>
  );
}
