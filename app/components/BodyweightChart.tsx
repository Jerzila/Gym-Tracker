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

type Point = { date: string; weight: number };

type Props = { data: Point[] };

export function BodyweightChart({ data }: Props) {
  return (
    <div className="h-56 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickFormatter={(v) =>
              v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""
            }
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v} kg`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(value) => [value != null ? `${value} kg` : "", "Weight"]}
            labelFormatter={(label) => (label ? new Date(label).toLocaleDateString() : "")}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: "#f59e0b", r: 3 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
