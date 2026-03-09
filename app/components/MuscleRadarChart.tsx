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

type BalanceRange = "this_week" | "last_week" | "this_month" | "last_month";

const RANGE_LEGEND_LABELS: Record<
  BalanceRange,
  { current: string; previous: string }
> = {
  this_week: { current: "This Week", previous: "Last Week" },
  last_week: { current: "Last Week", previous: "Week Before" },
  this_month: { current: "This Month", previous: "Last Month" },
  last_month: { current: "Last Month", previous: "Month Before" },
};

type Props = {
  range: BalanceRange;
  current: CategoryDistributionPoint[];
  previous: CategoryDistributionPoint[] | null;
};

const LIFTLY_ORANGE = "#f59e0b";
const MUTED_GREY = "#52525b";
const AXIS_LABEL_FILL = "#d4d4d8"; /* text-zinc-300 */
const CHART_ANIMATION_DURATION = 250;

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

function MuscleRadarChartInner({ range, current, previous }: Props) {
  const labels = RANGE_LEGEND_LABELS[range];
  const currentKey = labels.current;
  const previousKey = labels.previous;

  const data = useMemo(
    () =>
      current.map((c) => ({
        category: c.category,
        [currentKey]: c.value,
        ...(previous
          ? { [previousKey]: previous.find((p) => p.category === c.category)?.value ?? 0 }
          : {}),
      })),
    [current, previous, currentKey, previousKey]
  );

  const hasData =
    current.length > 0 &&
    !data.every((d) => (d[currentKey] ?? 0) === 0 && (d[previousKey] ?? 0) === 0);

  if (!hasData) {
    return (
      <div
        className="flex h-72 w-full flex-col items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-center text-sm text-zinc-500"
        style={{ minHeight: 288 }}
      >
        <span className="text-2xl" aria-hidden>
          📊
        </span>
        <p className="font-medium text-zinc-400">
          No workouts logged for this period.
        </p>
        <p>
          Add exercises to start seeing your training balance.
        </p>
      </div>
    );
  }

  const domainMax = getDomainMax(current, previous);

  return (
    <div
      className="h-72 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
      style={{ minHeight: 288 }}
    >
      <ResponsiveContainer width="100%" height={288}>
        <RadarChart data={data} margin={{ top: 24, right: 24, left: 24, bottom: 24 }}>
          <PolarGrid stroke="#3f3f46" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: AXIS_LABEL_FILL, fontSize: 11 }}
            tickFormatter={(value) => shortLabel(value)}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, domainMax]}
            tick={{ fill: AXIS_LABEL_FILL, fontSize: 10 }}
          />
          <Radar
            name={currentKey}
            dataKey={currentKey}
            stroke={LIFTLY_ORANGE}
            fill={LIFTLY_ORANGE}
            fillOpacity={0.25}
            strokeWidth={2.5}
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION_DURATION}
            animationEasing="ease-out"
          />
          {previous && (
            <Radar
              name={previousKey}
              dataKey={previousKey}
              stroke={MUTED_GREY}
              fill={MUTED_GREY}
              fillOpacity={0.12}
              strokeWidth={1.5}
              isAnimationActive={true}
              animationDuration={CHART_ANIMATION_DURATION}
              animationEasing="ease-out"
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
            wrapperStyle={{ fontSize: 12, marginTop: 10 }}
            formatter={(value) => <span className="text-zinc-400">{value}</span>}
            iconType="circle"
            iconSize={8}
            layout="horizontal"
            align="center"
            verticalAlign="bottom"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const MuscleRadarChart = memo(MuscleRadarChartInner);
