import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";

/* Spec §3 — QualityScoreGauge: radial donut for the data-quality score. */

const gaugeConfig = {
  score: {
    color: "var(--chart-1)",
    label: "Quality",
  },
} satisfies ChartConfig;

export function QualityScoreGauge({
  className,
  score,
  size = 168,
}: {
  className?: string;
  score: number;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const data = [{ fill: "var(--color-score)", name: "score", value: clamped }];

  return (
    <div
      className={className}
      style={{ height: size, position: "relative", width: size }}
    >
      <ChartContainer
        config={gaugeConfig}
        style={{ height: size, width: size }}
      >
        <RadialBarChart
          barSize={10}
          data={data}
          endAngle={90}
          innerRadius="82%"
          startAngle={-270}
        >
          <PolarAngleAxis
            angleAxisId={0}
            domain={[0, 100]}
            tick={false}
            type="number"
          />
          <RadialBar
            angleAxisId={0}
            background={{ fill: "var(--muted)" }}
            cornerRadius={999}
            dataKey="value"
          />
        </RadialBarChart>
      </ChartContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-semibold text-[30px] tabular-nums leading-none tracking-tight">
          {Math.round(clamped)}
          <span className="text-lg text-muted-foreground">%</span>
        </p>
        <p className="mt-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
          Verified
        </p>
      </div>
    </div>
  );
}
