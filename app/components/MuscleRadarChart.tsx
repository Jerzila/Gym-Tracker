"use client";

import { memo, useMemo, useRef, useCallback, useState, useEffect } from "react";
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
import type {
  MuscleBalanceRadarDistribution,
  MuscleBalanceRadarSegment,
} from "@/app/actions/insights";
import { ChartIcon } from "@/components/icons";

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
  distribution: MuscleBalanceRadarDistribution | null;
};

const LIFTLY_ORANGE = "#f59e0b";
const MUTED_GREY = "#52525b";
const AXIS_LABEL_FILL = "#d4d4d8";
const CHART_ANIMATION_DURATION = 250;

/** Fixed category order: index 0 → Back (top), then clockwise — must match angle math. */
const CATEGORIES = [
  "Back",
  "Biceps",
  "Chest",
  "Legs",
  "Shoulders",
  "Triceps",
] as const;

type MuscleName = (typeof CATEGORIES)[number];

const CHART_MARGIN = 24;

function shortLabel(category: string, maxLen: number = 12): string {
  const trimmed = category.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1).trim() + "…";
}

/** Share of total sets; 0–1 decimal when rendering (e.g. 32 or 32.5). */
function formatMuscleSharePct(rawPct: number): string {
  const rounded = Math.round(rawPct * 10) / 10;
  if (Number.isInteger(rounded)) return `${rounded}`;
  return rounded.toFixed(1);
}

function muscleShareFromSets(sets: number, totalSets: number): number {
  if (totalSets <= 0) return 0;
  return (sets / totalSets) * 100;
}

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

/** Map tap position to radar axis (inside the polygon). */
function getCategoryFromPolarTap(
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

function segmentByCategory(
  segments: MuscleBalanceRadarSegment[] | undefined,
  category: MuscleName
): MuscleBalanceRadarSegment | undefined {
  return segments?.find(
    (s) => s.category.trim().toLowerCase() === category.toLowerCase()
  );
}

function MuscleRadarChartInner({ range, distribution }: Props) {
  const labels = RANGE_LEGEND_LABELS[range];
  const currentKey = labels.current;
  const previousKey = labels.previous;
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<MuscleName | null>(null);
  const [pulseKey, setPulseKey] = useState(0);

  const segments = distribution?.segments ?? [];

  const hasPrevious = segments.some((s) => s.percentagePrevious !== null);

  const totalCurrentSets = useMemo(
    () =>
      CATEGORIES.reduce(
        (sum, cat) => sum + (segmentByCategory(segments, cat)?.sets ?? 0),
        0
      ),
    [segments]
  );

  const setsByCategory = useMemo(() => {
    const m = {} as Record<MuscleName, number>;
    for (const cat of CATEGORIES) {
      m[cat] = segmentByCategory(segments, cat)?.sets ?? 0;
    }
    return m;
  }, [segments]);

  const maxSetsAcross = useMemo(
    () => Math.max(...CATEGORIES.map((c) => setsByCategory[c])),
    [setsByCategory]
  );
  const minSetsAcross = useMemo(
    () => Math.min(...CATEGORIES.map((c) => setsByCategory[c])),
    [setsByCategory]
  );
  const allSetsEqual = maxSetsAcross === minSetsAcross;

  const lowTieCount = useMemo(
    () => CATEGORIES.filter((c) => setsByCategory[c] === minSetsAcross).length,
    [setsByCategory, minSetsAcross]
  );

  const renderMuscleAngleTick = useCallback(
    (props: {
      x: number | string;
      y: number | string;
      textAnchor: string;
      payload: { value?: unknown };
    }) => {
      const raw = props.payload?.value;
      const cat =
        typeof raw === "string" && (CATEGORIES as readonly string[]).includes(raw)
          ? (raw as MuscleName)
          : null;
      const nx = Number(props.x);
      const ny = Number(props.y);
      if (cat == null || Number.isNaN(nx) || Number.isNaN(ny)) return null;

      const sets = setsByCategory[cat];
      const share = muscleShareFromSets(sets, totalCurrentSets);
      const pct = formatMuscleSharePct(share);
      const textAnchor = props.textAnchor as "start" | "middle" | "end";
      const labelX =
        textAnchor === "end" ? nx + 10 : textAnchor === "start" ? nx - 10 : nx;

      const isHigh =
        !allSetsEqual && sets === maxSetsAcross && maxSetsAcross > 0;
      const isLow =
        !allSetsEqual && sets === minSetsAcross && maxSetsAcross > 0;

      const nameFill = isHigh ? "#f4f4f5" : AXIS_LABEL_FILL;
      const nameWeight = isHigh ? 600 : 400;
      const pctFill = isLow ? "#71717a" : isHigh ? "#e4e4e7" : "#a1a1aa";
      const pctSize = isLow ? 9 : 9.5;

      return (
        <text
          x={labelX}
          y={ny}
          textAnchor={textAnchor}
          className="pointer-events-none select-none"
        >
          <tspan
            x={labelX}
            dy="-0.65em"
            fill={nameFill}
            fontSize={11}
            fontWeight={nameWeight}
          >
            {shortLabel(cat)}
          </tspan>
          <tspan
            x={labelX}
            dy="1.2em"
            fill={pctFill}
            fontSize={pctSize}
            fontWeight={isLow ? 400 : 500}
          >
            {isLow && lowTieCount === 1 ? "⚠️ " : ""}
            {pct}%
          </tspan>
        </text>
      );
    },
    [
      allSetsEqual,
      lowTieCount,
      maxSetsAcross,
      minSetsAcross,
      setsByCategory,
      totalCurrentSets,
    ]
  );

  const data = useMemo(() => {
    return CATEGORIES.map((category) => {
      const seg = segmentByCategory(segments, category);
      return {
        category,
        [currentKey]: seg?.percentage ?? 0,
        ...(hasPrevious ? { [previousKey]: seg?.percentagePrevious ?? 0 } : {}),
      };
    });
  }, [segments, currentKey, previousKey, hasPrevious]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const category = getCategoryFromPolarTap(x, y, {
      width: rect.width,
      height: rect.height,
    });
    if (category) {
      setSelectedCategory(category);
      setPulseKey((k) => k + 1);
    }
  }, []);

  const selectedIndex =
    selectedCategory != null ? CATEGORIES.indexOf(selectedCategory) : -1;

  const hasData = data.some(
    (d) => Number(d[currentKey] ?? 0) > 0 || Number(d[previousKey] ?? 0) > 0
  );

  const selectedSeg =
    selectedCategory != null ? segmentByCategory(segments, selectedCategory) : null;

  useEffect(() => {
    setSelectedCategory(null);
  }, [range, distribution]);

  if (!hasData) {
    return (
      <div
        className="flex h-72 w-full flex-col items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-center text-sm text-zinc-500"
        style={{ minHeight: 288 }}
      >
        <span className="flex items-center justify-center text-zinc-400" aria-hidden>
          <ChartIcon size={24} />
        </span>
        <p className="font-medium text-zinc-400">No workouts logged for this period.</p>
        <p>Add exercises to start seeing your training balance.</p>
      </div>
    );
  }

  const domainMax = getDomainMax(
    CATEGORIES.map((c) => ({
      value: segmentByCategory(segments, c)?.percentage ?? 0,
    })),
    hasPrevious
      ? CATEGORIES.map((c) => ({
          value: segmentByCategory(segments, c)?.percentagePrevious ?? 0,
        }))
      : null
  );

  const fillOpacityCurrent = selectedCategory != null ? 0.42 : 0.3;

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        ref={containerRef}
        className="relative h-72 w-full touch-manipulation rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
        style={{ minHeight: 288 }}
        onPointerUp={onPointerUp}
        role="application"
        aria-label="Muscle balance chart. Tap inside the radar to select a muscle group."
      >
        <ResponsiveContainer width="100%" height={288}>
          <RadarChart data={data} margin={{ top: 28, right: 40, left: 40, bottom: 28 }}>
            <Tooltip active={false} />
            <PolarGrid stroke="#3f3f46" />
            <PolarAngleAxis dataKey="category" tick={renderMuscleAngleTick} />
            <PolarRadiusAxis
              angle={90}
              axisLine={false}
              tick={false}
              tickLine={false}
              domain={[0, domainMax]}
            />
            {hasPrevious && (
              <Radar
                name={previousKey}
                dataKey={previousKey}
                stroke={MUTED_GREY}
                fill={MUTED_GREY}
                fillOpacity={0.12}
                strokeWidth={selectedCategory ? 1.5 : 2}
                strokeLinejoin="round"
                isAnimationActive={true}
                animationDuration={CHART_ANIMATION_DURATION}
                animationEasing="ease-out"
                dot={({ index, cx, cy }) => {
                  const isActive = index === selectedIndex;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isActive ? 5 : 3}
                      fill={MUTED_GREY}
                      fillOpacity={isActive ? 0.9 : 0.45}
                      stroke={isActive ? "#a1a1aa" : "transparent"}
                      strokeWidth={1.5}
                      className="pointer-events-none"
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
              fillOpacity={fillOpacityCurrent}
              strokeWidth={selectedCategory ? 3.5 : 3}
              strokeLinejoin="round"
              isAnimationActive={true}
              animationDuration={CHART_ANIMATION_DURATION}
              animationEasing="ease-out"
              dot={({ index, cx, cy }) => {
                const isActive = index === selectedIndex;
                const baseR = isActive ? 6 : 3;
                return (
                  <g
                    key={isActive ? `${index}-${pulseKey}` : index}
                    transform={`translate(${cx},${cy})`}
                    className="pointer-events-none"
                  >
                    {isActive && (
                      <circle r={baseR + 6} fill="rgba(245, 158, 11, 0.22)" />
                    )}
                    <circle
                      r={baseR}
                      fill={LIFTLY_ORANGE}
                      fillOpacity={isActive ? 1 : 0.75}
                      stroke={isActive ? "#fbbf24" : "transparent"}
                      strokeWidth={2}
                      style={
                        isActive
                          ? {
                              filter:
                                "drop-shadow(0 0 4px rgba(251, 191, 36, 0.85)) drop-shadow(0 0 10px rgba(245, 158, 11, 0.35))",
                            }
                          : undefined
                      }
                      className={isActive ? "muscle-radar-node-pulse" : undefined}
                    />
                  </g>
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

      <MuscleBalanceInfoCard
        selectedCategory={selectedCategory}
        segment={selectedSeg ?? null}
        hasPrevious={hasPrevious}
        previousLabel={previousKey}
        currentLabel={currentKey}
      />
    </div>
  );
}

function MuscleBalanceInfoCard({
  selectedCategory,
  segment,
  hasPrevious,
  previousLabel,
  currentLabel,
}: {
  selectedCategory: MuscleName | null;
  segment: MuscleBalanceRadarSegment | null;
  hasPrevious: boolean;
  previousLabel: string;
  currentLabel: string;
}) {
  if (selectedCategory == null) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-500">
        Tap the chart to select a muscle group.
      </div>
    );
  }

  const muscleLabel = selectedCategory;
  const setsThis = segment?.sets ?? 0;
  const noData = setsThis <= 0;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Muscle</p>
      <p className="text-base font-semibold text-zinc-100">{muscleLabel}</p>

      {noData ? (
        <p className="mt-3 text-sm text-zinc-400">
          No training data for this muscle in this period.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-zinc-400">
            Sets this period:{" "}
            <span className="font-medium text-zinc-200">
              {setsThis} set{setsThis !== 1 ? "s" : ""}
            </span>
          </p>

          {segment && segment.topExercises.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Top exercises
              </p>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-sm text-zinc-300">
                {segment.topExercises.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          )}

          {hasPrevious && segment && (
            <div className="mt-4 border-t border-zinc-800/80 pt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Previous period comparison
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                <span className="text-zinc-500">{previousLabel}:</span>{" "}
                <span className="font-medium text-zinc-300">
                  {segment.setsPrevious ?? 0} set{(segment.setsPrevious ?? 0) !== 1 ? "s" : ""}
                </span>
              </p>
              <p className="mt-0.5 text-sm text-zinc-400">
                <span className="text-zinc-500">{currentLabel}:</span>{" "}
                <span className="font-medium text-amber-400/90">
                  {segment.sets} set{segment.sets !== 1 ? "s" : ""}
                </span>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const MuscleRadarChart = memo(MuscleRadarChartInner);
