"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Point = { date: string; weight: number; estimated1RM: number | null };

type Props = { data: Point[] };

const chartData = (data: Point[]) =>
  data.filter((d) => d.estimated1RM != null) as (Point & { estimated1RM: number })[];

export function Estimated1RMChart({ data }: Props) {
  const series = chartData(data);
  if (series.length === 0) return null;

  return (
    <div className="h-56 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3" style={{ minHeight: 224 }}>
      <ResponsiveContainer width="100%" height={224}>
        <LineChart data={series} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickFormatter={(v) => (v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "")}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v} kg`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(value) => [value != null ? `${value} kg` : "", "Est. 1RM"]}
            labelFormatter={(label) => (label ? new Date(label).toLocaleDateString() : "")}
          />
          <Line
            type="monotone"
            dataKey="estimated1RM"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: "#22c55e", r: 3 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
