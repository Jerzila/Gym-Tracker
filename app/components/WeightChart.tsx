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
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";

type Point = {
  date: string;
  /** Max set weight in workout (kg) */
  weight: number;
  estimated1RM: number | null;
  bestSetWeight?: number | null;
  bestSetReps?: number | null;
  setsInline?: string;
};

type Props = { data: Point[] };

export function WeightChart({ data }: Props) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  return (
    <div className="h-56 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3" style={{ minHeight: 224 }}>
      <ResponsiveContainer width="100%" height={224}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickFormatter={(v) => (v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "")}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${formatWeight(Number(v), { units })} ${weightLabel}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }}
            labelStyle={{ color: "#a1a1aa" }}
            cursor={{ stroke: "#71717a", strokeWidth: 1, strokeOpacity: 0.3 }}
            content={({ active, payload, label, coordinate, viewBox }) => {
              const raw = (payload?.[0] as { value?: unknown } | undefined)?.value;
              const value = raw != null && Number.isFinite(Number(raw)) ? Number(raw) : null;
              if (!active || value == null) return null;
              const x = coordinate?.x;
              const y = coordinate?.y;
              if (x == null || y == null) return null;
              const vbWidth =
                (viewBox as { width?: number } | undefined)?.width != null
                  ? Number((viewBox as { width?: number }).width)
                  : null;
              // Keep tooltip inside chart bounds so it doesn't get clipped on edge points.
              const paddingX = 72;
              const xClamped =
                vbWidth != null && Number.isFinite(vbWidth)
                  ? Math.min(Math.max(x, paddingX), vbWidth - paddingX)
                  : x;
              return (
                <div
                  style={{
                    position: "absolute",
                    left: xClamped,
                    top: y - 45,
                    transform: "translate(-50%, -100%)",
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    textAlign: "center",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div style={{ color: "#a1a1aa", fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                    {label ? new Date(label).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                  </div>
                  <div style={{ color: "#e4e4e7", fontSize: 16, fontWeight: 700 }}>
                    {formatWeight(value, { units })} {weightLabel}
                  </div>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: "#f59e0b", r: 4 }}
            activeDot={{ r: 6, stroke: "#ffffff", strokeWidth: 2, fill: "#f59e0b" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
