"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DailyChartProps {
  data: { day: string; challenge: number; baseline: number }[];
}

export function DailyChart({ data }: DailyChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Ingen data tilgængelig
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="day" className="text-xs" />
        <YAxis
          className="text-xs"
          tickFormatter={(v: number) => `${v} kWh`}
        />
        <Tooltip
          formatter={(value, name) => [
            `${value} kWh`,
            name === "baseline" ? "Baseline" : "Challenge",
          ]}
        />
        <Legend
          formatter={(value) =>
            value === "baseline" ? "Baseline" : "Challenge"
          }
        />
        <Bar
          dataKey="baseline"
          fill="#94A3B8"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="challenge"
          fill="#22C55E"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
