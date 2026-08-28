import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Spec §3 — KPICard: big number + small-caps label + optional delta chip. */

type TrendDirection = "down" | "neutral" | "up";

export interface KpiCardProps {
  delta?: string | null;
  deltaTone?: "negative" | "neutral" | "positive";
  icon: string;
  inverse?: boolean;
  label: string;
  loading?: boolean;
  trend?: TrendDirection | null;
  trendLabel?: string | null;
  trendTone?: "negative" | "neutral" | "positive";
  trendValue?: string | number | null;
  value: ReactNode;
}

const DELTA_TONES = {
  negative: "text-destructive",
  neutral: "text-muted-foreground",
  positive: "text-success",
} as const;

function resolveTrend(
  trend?: TrendDirection | null,
  deltaTone?: "negative" | "neutral" | "positive"
): TrendDirection | null {
  if (trend) {
    return trend;
  }
  if (deltaTone === "positive") {
    return "up";
  }
  if (deltaTone === "negative") {
    return "down";
  }
  return null;
}

function resolveTrendTone(
  trend: TrendDirection,
  trendTone?: "negative" | "neutral" | "positive",
  inverse?: boolean
): "negative" | "neutral" | "positive" {
  if (trendTone) {
    return trendTone;
  }
  if (trend === "neutral") {
    return "neutral";
  }
  if (inverse) {
    return trend === "down" ? "positive" : "negative";
  }
  return trend === "up" ? "positive" : "negative";
}

const SIGN_REGEX = /^[+-]/;

function cleanTrendValue(
  val: string | number | null | undefined
): string | null {
  if (val === null || val === undefined) {
    return null;
  }
  return String(val).replace(SIGN_REGEX, "");
}

function TrendIcon({ trend }: { trend: TrendDirection }) {
  if (trend === "up") {
    return <i aria-hidden="true" className="ri-arrow-up-line text-[12px]" />;
  }
  if (trend === "down") {
    return <i aria-hidden="true" className="ri-arrow-down-line text-[12px]" />;
  }
  return null;
}

function TrendBadge({
  trend,
  tone,
  displayValue,
}: {
  trend: TrendDirection;
  tone: "negative" | "neutral" | "positive";
  displayValue?: string | number | null;
}) {
  const toneClasses = {
    negative: "text-destructive",
    neutral: "text-muted-foreground",
    positive: "text-success",
  };

  const formattedValue = cleanTrendValue(displayValue);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium text-[12px] tabular-nums leading-none",
        toneClasses[tone]
      )}
    >
      <TrendIcon trend={trend} />
      {formattedValue ? <span>{formattedValue}</span> : null}
    </span>
  );
}

export function KpiCard({
  delta,
  deltaTone = "neutral",
  icon,
  inverse = false,
  label,
  loading = false,
  trend,
  trendLabel,
  trendTone,
  trendValue,
  value,
}: KpiCardProps) {
  const effectiveTrend = resolveTrend(trend, deltaTone);
  const effectiveTone = effectiveTrend
    ? resolveTrendTone(effectiveTrend, trendTone, inverse)
    : "neutral";
  const displayTrendValue = trendValue ?? (trend ? delta : null);

  return (
    <div className="flex items-center gap-3.5">
      <div
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-foreground/80 shadow-xs"
      >
        <i className={cn(icon, "text-[20px]")} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground text-sm">
          {label}
        </p>

        {loading ? (
          <div className="mt-1.5 h-7 w-20 animate-pulse rounded-md bg-muted" />
        ) : (
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <p className="font-semibold text-[24px] tabular-nums leading-none tracking-tight">
              {value}
            </p>

            {effectiveTrend ? (
              <TrendBadge
                displayValue={displayTrendValue}
                tone={effectiveTone}
                trend={effectiveTrend}
              />
            ) : null}

            {!effectiveTrend && delta ? (
              <span
                className={cn(
                  "font-medium text-[11.5px]",
                  DELTA_TONES[deltaTone]
                )}
              >
                {delta}
              </span>
            ) : null}

            {trendLabel ? (
              <span className="text-[11px] text-muted-foreground">
                {trendLabel}
              </span>
            ) : null}
          </div>
        )}
      </div>
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
