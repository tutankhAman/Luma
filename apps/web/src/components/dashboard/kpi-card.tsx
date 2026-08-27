import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Spec §3 — KPICard: big number + small-caps label + optional delta chip. */

export interface KpiCardProps {
  delta?: string | null;
  deltaTone?: "negative" | "neutral" | "positive";
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
  label,
  loading = false,
  value,
}: KpiCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.08)]">
      <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.08em]">
        {label}
      </p>
      {loading ? (
        <div className="mt-2.5 h-8 w-16 animate-pulse rounded-md bg-muted" />
      ) : (
        <p className="mt-1.5 font-semibold text-[28px] tabular-nums leading-none tracking-tight">
          {value}
        </p>
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
