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
  height = 200,
  labelKey = "label",
}: TrendChartProps) {
  return (
    <ChartContainer
      className={className}
      config={trendConfig}
      style={{ height }}
    >
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ left: -18, right: 8 }}
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
          tickLine={false}
          tickMargin={4}
          width={44}
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
