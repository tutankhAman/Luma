import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

/* Spec §3 — TrendChart: single-series area chart on the chart-1 token. */

const trendConfig = {
  value: {
    color: "var(--chart-1)",
    label: "Records",
  },
} satisfies ChartConfig;

const TICK_STEP = 250;
const MIN_UPPER_BOUND = 1000;

function computeYAxisConfig(data: object[], dataKey: string) {
  let max = 0;
  for (const item of data) {
    const val = (item as Record<string, unknown>)[dataKey];
    if (typeof val === "number" && val > max) {
      max = val;
    }
  }

  const upper = Math.max(
    MIN_UPPER_BOUND,
    Math.ceil(max / TICK_STEP) * TICK_STEP
  );
  const ticks: number[] = [];
  for (let tick = 0; tick <= upper; tick += TICK_STEP) {
    ticks.push(tick);
  }

  return { domain: [0, upper] as [number, number], ticks };
}

export interface TrendChartProps {
  className?: string;
  data: object[];
  dataKey?: string;
  height?: number;
  labelKey?: string;
}

export function TrendChart({
  className,
  data,
  dataKey = "value",
  height = 250,
  labelKey = "label",
}: TrendChartProps) {
  const yConfig = useMemo(
    () => computeYAxisConfig(data, dataKey),
    [data, dataKey]
  );

  return (
    <ChartContainer
      className={className}
      config={trendConfig}
      style={{ height }}
    >
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ bottom: 0, left: 4, right: 12, top: 8 }}
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-value)"
              stopOpacity={0.22}
            />
            <stop
              offset="100%"
              stopColor="var(--color-value)"
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey={labelKey}
          minTickGap={28}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          domain={yConfig.domain}
          tickFormatter={(val: number) => val.toLocaleString()}
          tickLine={false}
          tickMargin={8}
          ticks={yConfig.ticks}
          width={42}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Area
          dataKey={dataKey}
          fill="url(#trend-fill)"
          stroke="var(--color-value)"
          strokeWidth={1.75}
          type="monotone"
        />
      </AreaChart>
    </ChartContainer>
  );
}
