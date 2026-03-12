"use client";

import { memo, useMemo, useRef, useCallback, useState } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
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

export type MuscleBalanceTooltipPoint = {
  category: string;
  sets: number;
  exercises: string[];
};

type Props = {
  range: BalanceRange;
  current: CategoryDistributionPoint[];
  previous: CategoryDistributionPoint[] | null;
  /** Optional: sets and top exercises per category for hover tooltip. */
  tooltipData?: MuscleBalanceTooltipPoint[];
};

const LIFTLY_ORANGE = "#f59e0b";
const MUTED_GREY = "#52525b";
const AXIS_LABEL_FILL = "#d4d4d8";
const CHART_ANIMATION_DURATION = 250;
const WIDGET_TRANSITION_MS = 150;

/** Fixed category order for axis-angle hover. Index 0 → Back (top), then clockwise. */
const CATEGORIES = [
  "Back",
  "Biceps",
  "Chest",
  "Legs",
  "Shoulders",
  "Triceps",
] as const;

type MuscleName = (typeof CATEGORIES)[number];

/** Chart margin (px); used to estimate radar drawing radius so hover works only inside the hexagon. */
const CHART_MARGIN = 24;

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

/**
 * Hover only inside the radar hexagon: use center, cursor offset, and radius check.
 * Returns the hovered category or null if cursor is outside the radar.
 */
function getHoveredCategoryFromAngle(
  offsetX: number,
  offsetY: number,
  rect: { width: number; height: number }
): MuscleName | null {
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const dx = offsetX - centerX;
  const dy = offsetY - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const radius = Math.max(
    0,
    Math.min(rect.width, rect.height) / 2 - CHART_MARGIN
  );
  if (distance > radius) return null;

  const angle = Math.atan2(dy, dx);
  const twoPi = Math.PI * 2;
  const normalized = (angle + Math.PI / 2 + twoPi) % twoPi;
  const axisCount = 6;
  const index = Math.floor(normalized / (twoPi / axisCount));
  const clamped = Math.max(0, Math.min(index, CATEGORIES.length - 1));
  return CATEGORIES[clamped];
}

function getValueByCategory(
  points: CategoryDistributionPoint[],
  category: string
): number {
  const normalized = category.trim().toLowerCase();
  const found = points.find(
    (p) => p.category.trim().toLowerCase() === normalized
  );
  return found?.value ?? 0;
}

function MuscleRadarChartInner({ range, current, previous, tooltipData }: Props) {
  const labels = RANGE_LEGEND_LABELS[range];
  const currentKey = labels.current;
  const previousKey = labels.previous;
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCategory, setHoveredCategory] = useState<MuscleName | null>(null);

  const data = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        [currentKey]: getValueByCategory(current, category),
        ...(previous
          ? { [previousKey]: getValueByCategory(previous, category) }
          : {}),
      })),
    [current, previous, currentKey, previousKey]
  );

  const onHover = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const category = getHoveredCategoryFromAngle(mouseX, mouseY, {
        width: rect.width,
        height: rect.height,
      });
      setHoveredCategory((prev) => (prev === category ? prev : category));
    },
    []
  );

  const onHoverLeave = useCallback(() => {
    setHoveredCategory(null);
  }, []);

  const hasData = data.some(
    (d) => Number(d[currentKey] ?? 0) > 0 || Number(d[previousKey] ?? 0) > 0
  );

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
  const hoveredRow =
    hoveredCategory != null
      ? data.find((d) => d.category === hoveredCategory) ?? null
      : null;
  const hoveredTooltip =
    hoveredCategory != null && tooltipData
      ? tooltipData.find(
          (t) => t.category.trim().toLowerCase() === hoveredCategory.trim().toLowerCase()
        ) ?? null
      : null;
  const hoveredIndex =
    hoveredCategory != null ? CATEGORIES.indexOf(hoveredCategory) : null;

  return (
    <div
      ref={containerRef}
      className="relative h-72 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
      style={{ minHeight: 288 }}
      onMouseMove={onHover}
      onMouseLeave={onHoverLeave}
    >
      {/* Fixed info widget — top-right, does not cover chart */}
      <div
        className="absolute right-4 top-4 z-10 min-w-[140px] max-w-[180px] rounded-lg border border-zinc-700/80 bg-zinc-900/95 px-3 py-2.5 text-left shadow-lg backdrop-blur-sm sm:right-4 sm:top-4"
        style={{
          transition: `opacity ${WIDGET_TRANSITION_MS}ms ease`,
        }}
      >
        {hoveredRow ? (
          <div key={hoveredCategory} className="radar-widget-fade space-y-1.5">
            <div className="font-medium text-zinc-200">
              {hoveredRow.category}
            </div>
            {hoveredTooltip != null && (
              <>
                <div className="text-sm text-zinc-400">
                  Sets in this period:{" "}
                  <span className="font-medium text-zinc-300">
                    {hoveredTooltip.sets} set{hoveredTooltip.sets !== 1 ? "s" : ""}
                  </span>
                </div>
                {hoveredTooltip.exercises.length > 0 && (
                  <div className="text-xs text-zinc-500">
                    <span className="block font-medium uppercase tracking-wider text-zinc-500">
                      Exercises contributing:
                    </span>
                    <ul className="mt-0.5 list-inside list-disc space-y-0.5">
                      {hoveredTooltip.exercises.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            <div className="space-y-0.5 text-sm text-zinc-400">
              {previous && (
                <div className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: MUTED_GREY }}
                    aria-hidden
                  />
                  <span>
                    Last period: {hoveredRow[previousKey] != null ? `${hoveredRow[previousKey]}%` : "—"}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: LIFTLY_ORANGE }}
                  aria-hidden
                />
                <span>
                  This period: {hoveredRow[currentKey] != null ? `${hoveredRow[currentKey]}%` : "—"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p key="default" className="radar-widget-fade text-sm text-zinc-500">
            Hover over a muscle group
          </p>
        )}
      </div>

      {/* Default tooltip disabled; axis-angle hover only. Top-right card is the only hover display. */}
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
          {previous && (
            <Radar
              name={previousKey}
              dataKey={previousKey}
              stroke={MUTED_GREY}
              fill={MUTED_GREY}
              fillOpacity={0.15}
              strokeWidth={2}
              strokeLinejoin="round"
              isAnimationActive={true}
              animationDuration={CHART_ANIMATION_DURATION}
              animationEasing="ease-out"
              dot={({ index, cx, cy }) => {
                const isActive = index === hoveredIndex;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isActive ? 5 : 3}
                    fill={MUTED_GREY}
                    fillOpacity={isActive ? 0.9 : 0.5}
                    stroke={isActive ? "#a1a1aa" : "transparent"}
                    strokeWidth={1.5}
                    pointerEvents="none"
                  />
                );
              }}
            />
          )}
          <Radar
            name={currentKey}
            dataKey={currentKey}
            stroke={LIFTLY_ORANGE}
            fill={LIFTLY_ORANGE}
            fillOpacity={0.3}
            strokeWidth={3}
            strokeLinejoin="round"
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION_DURATION}
            animationEasing="ease-out"
            dot={({ index, cx, cy }) => {
              const isActive = index === hoveredIndex;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isActive ? 6 : 3}
                  fill={LIFTLY_ORANGE}
                  fillOpacity={isActive ? 1 : 0.7}
                  stroke={isActive ? "#fbbf24" : "transparent"}
                  strokeWidth={1.5}
                  pointerEvents="none"
                />
              );
            }}
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
