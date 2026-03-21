"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";

type Point = { date: string; weight: number };

type Props = { data: Point[] };

function yAxisDomain(points: Point[]): [number, number] {
  if (points.length === 0) return [0, 100];
  const weights = points.map((p) => p.weight);
  const lo = Math.min(...weights);
  const hi = Math.max(...weights);
  if (lo === hi) {
    const pad = Math.max(lo * 0.04, 1);
    return [Math.max(0, lo - pad), hi + pad];
  }
  const pad = Math.max((hi - lo) * 0.12, 0.5);
  return [Math.max(0, lo - pad), hi + pad];
}

export function BodyweightChart({ data }: Props) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  const domain = useMemo(() => yAxisDomain(data), [data]);
  const singlePoint = data.length === 1;
  return (
    <div className="h-56 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3" style={{ minHeight: 224 }}>
      <ResponsiveContainer width="100%" height={224}>
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
            domain={domain}
            tickFormatter={(v) => `${formatWeight(Number(v), { units })} ${weightLabel}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(value) => [value != null ? `${formatWeight(Number(value), { units })} ${weightLabel}` : "", "Weight"]}
            labelFormatter={(label) => (label ? new Date(label).toLocaleDateString() : "")}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: "#f59e0b", r: singlePoint ? 5 : 3 }}
            activeDot={{ r: singlePoint ? 6 : 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
