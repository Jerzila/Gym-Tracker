"use client";

import { memo, useMemo } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { CategoryDistributionPoint } from "@/app/actions/insights";

type Props = {
  current: CategoryDistributionPoint[];
  previous: CategoryDistributionPoint[] | null;
};

const LIFTLY_ORANGE = "#f59e0b";
const MUTED_GREY = "#52525b";

/** Keep axis labels short to avoid overlap (max 12 chars). */
function shortLabel(category: string, maxLen: number = 12): string {
  const trimmed = category.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1).trim() + "…";
}

/** Chart max so the shape fills the space: if highest value is 30%, domain goes to ~35–40%. */
function getDomainMax(current: { value: number }[], previous: { value: number }[] | null): number {
  const allValues = [
    ...current.map((c) => c.value),
    ...(previous ?? []).map((p) => p.value),
  ];
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 0;
  if (maxVal <= 0) return 100;
  const padded = Math.ceil(maxVal / 5) * 5 + 10;
  return Math.min(100, padded);
}

function MuscleRadarChartInner({ current, previous }: Props) {
  const data = useMemo(
    () =>
      current.map((c) => ({
        category: c.category,
        "This period": c.value,
        ...(previous
          ? { "Previous period": previous.find((p) => p.category === c.category)?.value ?? 0 }
          : {}),
      })),
    [current, previous]
  );

  if (current.length === 0 || data.every((d) => d["This period"] === 0 && (d["Previous period"] ?? 0) === 0)) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 text-sm text-zinc-500">
        No training data for this period
      </div>
    );
  }

  const domainMax = getDomainMax(current, previous);

  return (
    <div
      className="h-72 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
      style={{ minHeight: 288 }}
    >
      <ResponsiveContainer width="100%" height={288}>
        <RadarChart data={data} margin={{ top: 16, right: 16, left: 16, bottom: 16 }}>
          <PolarGrid stroke="#3f3f46" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            tickFormatter={(value) => shortLabel(value)}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, domainMax]}
            tick={{ fill: "#71717a", fontSize: 10 }}
          />
          <Radar
            name="This period"
            dataKey="This period"
            stroke={LIFTLY_ORANGE}
            fill={LIFTLY_ORANGE}
            fillOpacity={0.25}
            strokeWidth={2.5}
            isAnimationActive={false}
          />
          {previous && (
            <Radar
              name="Previous period"
              dataKey="Previous period"
              stroke={MUTED_GREY}
              fill={MUTED_GREY}
              fillOpacity={0.12}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
            }}
            formatter={(value: number | undefined) => [value != null ? `${value}%` : "", ""]}
            labelFormatter={(label) => label}
            labelStyle={{ color: "#a1a1aa" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => <span className="text-zinc-400">{value}</span>}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const MuscleRadarChart = memo(MuscleRadarChartInner);
