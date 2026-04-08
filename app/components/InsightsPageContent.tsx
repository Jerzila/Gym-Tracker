"use client";

import { useEffect, useMemo, useState, useRef, memo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  getInsightsCriticalData,
  getInsightsDeferredData,
  getInsightsInitialData,
  getInsightsRangeData,
  getMonthlyAnalytics,
  getMonthsWithWorkoutData,
  type WeeklyComparison,
  type MuscleDistribution,
  type MonthlySummary,
  type MonthlyAnalytics,
  type MonthOption,
  type InsightsRange,
  type InsightsRangeData,
  type InsightsRangeContext,
  type OneRMPoint,
  type TopStrengthGain,
  type TrainingBalanceResult,
  type InsightItem,
  type Estimated1RMByExercise,
} from "@/app/actions/insights";
import { normalizeLoadType } from "@/lib/loadType";
import {
  computeStrengthVelocityFromMaxWeights,
  type MaxSessionWeightByExercise,
} from "@/lib/strengthVelocity";
import { computeTopImprovementsDisplayMetrics } from "@/lib/topImprovementsDisplay";
import { getCurrentYearMonth } from "@/lib/insightsDates";
import type { Exercise } from "@/lib/types";
import type { StrengthRankingWithExercises } from "@/app/actions/strengthRanking";
import { overallRankDisplayFromOutput } from "@/lib/strengthRanking";
import { SkeletonInsightsPage, SkeletonPanel } from "@/app/components/Skeleton";
import { useWorkoutDataCache } from "@/app/components/WorkoutDataCacheContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";
import { InstallPromptOnNewRank } from "@/app/components/InstallPromptOnNewRank";
import { MuscleProgressCompareModal } from "@/app/components/MuscleProgressCompareModal";
import {
  ExerciseProgressRankingsModal,
  ProgressRankingRow,
  type ExerciseProgressRankRow,
} from "@/app/components/ExerciseProgressRankingsModal";
import { SwapHorizontalIcon } from "@/components/icons";
import { AdvancedStrengthAnalyticsSection } from "@/app/components/AdvancedStrengthAnalyticsSection";

const MuscleRadarChart = dynamic(
  () => import("@/app/components/MuscleRadarChart").then((m) => ({ default: m.MuscleRadarChart })),
  { ssr: false, loading: () => <SkeletonPanel height="h-72" /> }
);

const DashboardStrengthDiagram = dynamic(
  () =>
    import("@/app/components/DashboardStrengthDiagram").then((m) => ({
      default: m.DashboardStrengthDiagram,
    })),
  { ssr: false, loading: () => <SkeletonPanel height="h-64" /> }
);

const MuscleRankList = dynamic(
  () =>
    import("@/app/components/MuscleRankList").then((m) => ({
      default: m.MuscleRankList,
    })),
  { ssr: false }
);


const InsightsRankCard = dynamic(
  () =>
    import("@/app/components/InsightsRankCard").then((m) => ({
      default: m.InsightsRankCard,
    })),
  { ssr: false }
);

const RankImprovementCard = dynamic(
  () =>
    import("@/app/components/RankImprovementCard").then((m) => ({
      default: m.RankImprovementCard,
    })),
  { ssr: false }
);

function formatVolume(n: number): string {
  return Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

type Props = {
  exercises: Exercise[];
  gender?: "male" | "female";
  strengthRanking: StrengthRankingWithExercises | null;
  earliestWorkoutDate: string | null;
};

const RANGE_OPTIONS: { value: InsightsRange; label: string }[] = [
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
];

/** Training Balance uses only these 4 ranges; we precompute all on load. */
type BalanceRange = "this_week" | "last_week" | "this_month" | "last_month";


const ONE_RM_RANGES: { value: "30" | "90" | "all"; label: string }[] = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export function InsightsPageContent({
  exercises,
  gender = "male",
  strengthRanking,
  earliestWorkoutDate,
}: Props) {
  const router = useRouter();
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  const [weekly, setWeekly] = useState<WeeklyComparison | null>(null);
  const [muscleRange, setMuscleRange] = useState<InsightsRange>("this_week");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [oneRMRange, setOneRMRange] = useState<"30" | "90" | "all">("90");
  /** Precomputed on initial load; charts read from this (no fetch on exercise/range change). */
  const [estimated1RMByExercise, setEstimated1RMByExercise] = useState<Estimated1RMByExercise>({});
  const [maxSessionWeightByExercise, setMaxSessionWeightByExercise] =
    useState<MaxSessionWeightByExercise>({});
  const [monthly, setMonthly] = useState<MonthlySummary | null>(null);
  const [topStrengthGains, setTopStrengthGains] = useState<TopStrengthGain[]>([]);
  const [topStrengthGainsAllTime, setTopStrengthGainsAllTime] = useState<TopStrengthGain[]>([]);
  const [trainingBalance, setTrainingBalance] = useState<TrainingBalanceResult | null>(null);
  const [insightItems, setInsightItems] = useState<InsightItem[]>([]);
  const [plateauExercises, setPlateauExercises] = useState<{ name: string }[]>([]);
  /** Precomputed per-period data for Training Balance; switching periods is instant. */
  const [balanceDatasets, setBalanceDatasets] = useState<Partial<Record<BalanceRange, InsightsRangeData>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [monthOptions, setMonthOptions] = useState<MonthOption[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthOption>(() => {
    const { year, month } = getCurrentYearMonth();
    return { year, month: month + 1 };
  });
  const [monthlyAnalytics, setMonthlyAnalytics] = useState<MonthlyAnalytics | null>(null);
  const [monthlyAnalyticsCache, setMonthlyAnalyticsCache] = useState<
    Record<string, MonthlyAnalytics>
  >({});
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const monthlyCacheRef = useRef<Record<string, MonthlyAnalytics>>({});
  monthlyCacheRef.current = monthlyAnalyticsCache;
  const [showDeferred, setShowDeferred] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showProgressRankingsModal, setShowProgressRankingsModal] = useState(false);
  const cache = useWorkoutDataCache();
  useEffect(() => {
    const t = setTimeout(() => setShowDeferred(true), 0);
    return () => clearTimeout(t);
  }, []);

  const exerciseList = useMemo(() => exercises.filter((e) => e.id), [exercises]);
  /**
   * All exercises with positive progress rate (kg/mo), sorted by rate desc then earliest
   * velocity window start (stable tie-break). Same `computeStrengthVelocityFromMaxWeights` as before.
   */
  const progressRateRankings = useMemo((): ExerciseProgressRankRow[] => {
    type Raw = {
      exerciseId: string;
      name: string;
      velocityKgPerMonth: number;
      fromDate: string;
      totalProgressKg: number;
      rateKgPerMonth: number | null;
    };
    const raw: Raw[] = [];
    for (const ex of exerciseList) {
      if (normalizeLoadType(ex.load_type) === "timed") continue;
      const pts = maxSessionWeightByExercise[ex.id] ?? [];
      const validWorkouts = pts.filter((p) => p.date && p.maxWeightKg > 0);
      if (validWorkouts.length < 2) continue;

      const r = computeStrengthVelocityFromMaxWeights(pts);
      if (r.kind !== "ok" || r.velocityKgPerMonth <= 0) continue;

      const disp = computeTopImprovementsDisplayMetrics(pts);
      if (!disp) continue;

      let totalProgressKg = disp.totalKg;
      let rateKgPerMonth = disp.rateKgPerMonth;
      if (!Number.isFinite(totalProgressKg)) {
        totalProgressKg = 0;
        if (rateKgPerMonth == null && r.kind === "ok") {
          rateKgPerMonth = Math.round(r.velocityKgPerMonth * 10) / 10;
        }
      }

      raw.push({
        exerciseId: ex.id,
        name: ex.name,
        velocityKgPerMonth: r.velocityKgPerMonth,
        fromDate: r.fromDate,
        totalProgressKg,
        rateKgPerMonth,
      });
    }
    raw.sort((a, b) => {
      if (b.velocityKgPerMonth !== a.velocityKgPerMonth) {
        return b.velocityKgPerMonth - a.velocityKgPerMonth;
      }
      const dateCmp = a.fromDate.localeCompare(b.fromDate);
      if (dateCmp !== 0) return dateCmp;
      return a.exerciseId.localeCompare(b.exerciseId);
    });

    return raw.map((r, i) => ({
      rank: i + 1,
      exerciseId: r.exerciseId,
      name: r.name,
      totalProgressKg: r.totalProgressKg,
      rateKgPerMonth: r.rateKgPerMonth,
    }));
  }, [exerciseList, maxSessionWeightByExercise]);

  const topProgressRatePreview = useMemo(
    () => progressRateRankings.slice(0, 3),
    [progressRateRankings]
  );
  const defaultExId = exerciseList[0]?.id ?? "";

  useEffect(() => {
    if (!selectedExerciseId && defaultExId) setSelectedExerciseId(defaultExId);
  }, [defaultExId, selectedExerciseId]);

  /** Build InsightsRangeData for this_week from initial payload (so we can store in balanceDatasets). */
  const buildRangeDataFromInitial = useMemo(
    () => (data: Awaited<ReturnType<typeof getInsightsInitialData>>): InsightsRangeData => ({
      muscleBalanceRadar: data.muscleBalanceRadar ?? null,
      muscleDistribution: data.muscleDistribution ?? null,
      topStrengthGains: data.topStrengthGains ?? [],
      trainingBalance: data.trainingBalance ?? null,
      insightItems: data.insightItems ?? [],
    }),
    []
  );

  useEffect(() => {
    const cached = cache?.getCachedInsights?.() ?? null;
    if (cached) {
      if (cached.weeklyError) setError(cached.weeklyError);
      else setWeekly(cached.weekly);
      setMonthly(cached.monthly ?? null);
      setPlateauExercises(cached.plateauExercises);
      setTopStrengthGains(cached.topStrengthGains);
      setTopStrengthGainsAllTime(cached.topStrengthGainsAllTime ?? []);
      setTrainingBalance(cached.trainingBalance ?? null);
      setInsightItems(cached.insightItems);
      setEstimated1RMByExercise(cached.estimated1RMByExercise ?? {});
      setMaxSessionWeightByExercise(cached.maxSessionWeightByExercise ?? {});
      setBalanceDatasets((prev) => ({ ...prev, this_week: buildRangeDataFromInitial(cached) }));
      setLoading(false);
      const context: InsightsRangeContext = {
        weekly: cached.weekly ?? null,
        monthly: cached.monthly ?? null,
        plateauExercises: cached.plateauExercises,
      };
      Promise.all(
        (["last_week", "this_month", "last_month"] as const).map((range) =>
          getInsightsRangeData(range, context).then((res) => ({ range, res }))
        )
      ).then((results) => {
        setBalanceDatasets((prev) => {
          const next = { ...prev };
          for (const { range, res } of results) next[range] = res;
          return next;
        });
      });
    } else {
      setLoading(true);
      setError(null);
    }
    let cancelled = false;
    // Load critical data first so the page can paint quickly; then load deferred (monthly, plateau, all-time gains).
    getInsightsCriticalData().then((data) => {
      if (cancelled) return;
      if (data.weeklyError) setError(data.weeklyError);
      else setWeekly(data.weekly);
      setMonthly(data.monthly ?? null);
      setPlateauExercises(data.plateauExercises);
      setTopStrengthGains(data.topStrengthGains);
      setTopStrengthGainsAllTime(data.topStrengthGainsAllTime ?? []);
      setTrainingBalance(data.trainingBalance ?? null);
      setInsightItems(data.insightItems);
      setEstimated1RMByExercise(data.estimated1RMByExercise ?? {});
      setMaxSessionWeightByExercise(data.maxSessionWeightByExercise ?? {});
      setBalanceDatasets((prev) => ({ ...prev, this_week: buildRangeDataFromInitial(data) }));
      setLoading(false);
      const context: InsightsRangeContext = {
        weekly: data.weekly ?? null,
        monthly: data.monthly ?? null,
        plateauExercises: data.plateauExercises,
      };
      // Preload other balance ranges in the background.
      Promise.all(
        (["last_week", "this_month", "last_month"] as const).map((range) =>
          getInsightsRangeData(range, context).then((res) => ({ range, res }))
        )
      ).then((results) => {
        if (cancelled) return;
        setBalanceDatasets((prev) => {
          const next = { ...prev };
          for (const { range, res } of results) next[range] = res;
          return next;
        });
      });
      // Deferred: monthly summary, plateau exercises, all-time strength gains. Then cache full data.
      getInsightsDeferredData(data.estimated1RMByExercise ?? {}).then((deferred) => {
        if (cancelled) return;
        setMonthly(deferred.monthly ?? null);
        setPlateauExercises(deferred.plateauExercises);
        setTopStrengthGainsAllTime(deferred.topStrengthGainsAllTime ?? []);
        const fullData: Awaited<ReturnType<typeof getInsightsInitialData>> = {
          ...data,
          monthly: deferred.monthly ?? null,
          plateauExercises: deferred.plateauExercises,
          topStrengthGainsAllTime: deferred.topStrengthGainsAllTime ?? [],
        };
        cache?.setCachedInsights?.(fullData);
      });
    });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; cache is stable
  }, []);

  useEffect(() => {
    getMonthsWithWorkoutData().then((res) => {
      const list = res.data ?? [];
      const { year, month } = getCurrentYearMonth();
      const current = { year, month: month + 1 };
      const hasCurrent = list.some((o) => o.year === current.year && o.month === current.month);
      setMonthOptions(hasCurrent ? list : [current, ...list]);
    });
  }, []);

  useEffect(() => {
    const key = `${selectedMonth.year}-${selectedMonth.month}`;
    const cached = monthlyCacheRef.current[key];
    if (cached) {
      setMonthlyAnalytics(cached);
      return;
    }
    setLoadingMonthly(true);
    getMonthlyAnalytics(selectedMonth.year, selectedMonth.month).then((res) => {
      setLoadingMonthly(false);
      if (res.data) {
        const next = { ...monthlyCacheRef.current, [key]: res.data };
        monthlyCacheRef.current = next;
        setMonthlyAnalyticsCache(next);
        setMonthlyAnalytics(res.data);
      } else {
        setMonthlyAnalytics(null);
      }
    });
  }, [selectedMonth.year, selectedMonth.month]);

  /** Training Balance: use only precomputed data for selected range; show skeleton until that range is loaded. */
  const currentRangeData = balanceDatasets[muscleRange as BalanceRange];
  const balanceRangeReady = currentRangeData !== undefined;

  /** Filter precomputed 1RM by selected range; no fetch, instant when changing exercise or range. */
  const oneRMData = useMemo(() => {
    const points = estimated1RMByExercise[selectedExerciseId] ?? [];
    if (oneRMRange === "all") return points;
    const cutoff = new Date();
    if (oneRMRange === "30") cutoff.setUTCDate(cutoff.getUTCDate() - 30);
    else cutoff.setUTCDate(cutoff.getUTCDate() - 90);
    const start = cutoff.toISOString().slice(0, 10);
    return points.filter((p) => p.date >= start);
  }, [estimated1RMByExercise, selectedExerciseId, oneRMRange]);

  if (loading && !weekly) {
    return <SkeletonInsightsPage />;
  }

  if (error) {
    return (
      <p className="rounded-xl bg-red-950/50 px-4 py-3 text-sm text-red-300">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <InstallPromptOnNewRank overallRankSlug={strengthRanking?.overallRankSlug} />
      {/* Section 1: Top Rank Card */}
      {strengthRanking && (
        <section>
          <InsightsRankCard display={overallRankDisplayFromOutput(strengthRanking)} />
        </section>
      )}

      {/* Section 2: Improve Your Rank — full width under Rank Card */}
      {strengthRanking && (
        <section className="mt-4 w-full">
          <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Improve Your Rank
          </h3>
          <div className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 py-2.5 px-3">
            <RankImprovementCard data={strengthRanking} />
          </div>
        </section>
      )}

      <div className="border-t border-zinc-800/60 pt-2 sm:pt-3" aria-hidden />

      {/* Muscle Strength — diagram, list, weakest */}
      {strengthRanking && (
        <>
          <section id="muscle-strength">
            <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Muscle Strength
            </h3>
            <DashboardStrengthDiagram data={strengthRanking} gender={gender} />
          </section>
          <section className="mt-6">
            <MuscleRankList data={strengthRanking} />
          </section>
        </>
      )}

      {strengthRanking && (
        <section className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowCompareModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(255,170,40,0.4)] bg-[rgba(255,170,40,0.12)] px-[18px] py-[14px] text-sm font-semibold text-[#FFAA28] transition-[transform,background-color,border-color] duration-150 ease-out hover:border-[rgba(255,170,40,0.55)] hover:bg-[rgba(255,170,40,0.18)] active:scale-[0.97]"
          >
            <SwapHorizontalIcon size={18} className="shrink-0" aria-hidden="true" />
            Compare Progress
          </button>
        </section>
      )}

      <MuscleProgressCompareModal
        open={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        earliestWorkoutDate={earliestWorkoutDate ?? null}
        onConfirm={({ startDate, endDate }) => {
          setShowCompareModal(false);
          router.push(`/insights/strength-progress?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`);
        }}
      />

      <ExerciseProgressRankingsModal
        open={showProgressRankingsModal}
        onClose={() => setShowProgressRankingsModal(false)}
        rows={progressRateRankings}
        units={units}
      />

      {/* Muscle Balance — total sets per muscle group; tap chart for details */}
      <section id="muscle-balance" className="mt-6">
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Muscle Balance
        </h3>
        <p className="mb-2 text-xs text-zinc-500">
          Total sets per muscle group for the selected period. Tap a muscle group to see details.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMuscleRange(opt.value)}
              className={`tap-feedback rounded-lg border px-3 py-1.5 text-sm transition active:scale-[0.98] ${
                muscleRange === opt.value
                  ? "border-amber-500/60 bg-amber-500/10 text-amber-400"
                  : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {!balanceRangeReady ? (
          <SkeletonPanel height="h-72" />
        ) : (
          <MuscleRadarChart
            key={muscleRange}
            range={muscleRange as BalanceRange}
            distribution={currentRangeData?.muscleBalanceRadar ?? null}
          />
        )}
        {balanceRangeReady && currentRangeData?.trainingBalance && (
          <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Training Balance
            </h4>
            <p className="text-sm text-zinc-300">
              Upper Body: {currentRangeData.trainingBalance.upperPct}% · Lower Body: {currentRangeData.trainingBalance.lowerPct}%
            </p>
            <p className={`mt-1 text-sm ${currentRangeData.trainingBalance.isBalanced ? "text-emerald-400" : "text-amber-400"}`}>
              {currentRangeData.trainingBalance.isBalanced ? "✔ " : "⚠ "}
              {currentRangeData.trainingBalance.message}
            </p>
          </div>
        )}
      </section>

      <div className="border-t border-zinc-800/60 pt-4" aria-hidden />

      {/* Strength Progress (1RM) */}
      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Estimated 1RM progression
        </h3>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1.5 text-sm text-zinc-200 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          >
            {exerciseList.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
            {exerciseList.length === 0 && (
              <option value="">No exercises</option>
            )}
          </select>
          {ONE_RM_RANGES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setOneRMRange(opt.value)}
              className={`tap-feedback rounded-lg border px-3 py-1.5 text-sm transition active:scale-[0.98] ${
                oneRMRange === opt.value
                  ? "border-amber-500/60 bg-amber-500/10 text-amber-400"
                  : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <StrengthProgressChart data={oneRMData} />

        <div className="mt-3">
          <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Top Improvements
          </h4>
          {loading ? (
            <p className="min-h-[3.5rem] rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-center text-sm leading-snug text-zinc-500">
              Loading…
            </p>
          ) : progressRateRankings.length === 0 ? (
            <div className="min-h-[3.5rem] rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-center">
              <p className="text-sm leading-snug text-zinc-500">
                No improvement data yet. Log more workouts to see rankings.
              </p>
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {topProgressRatePreview.map((row) => (
                  <li
                    key={row.exerciseId}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-2.5 py-2 transition hover:border-zinc-700"
                  >
                    <ProgressRankingRow row={row} units={units} />
                  </li>
                ))}
              </ul>
              {progressRateRankings.length > 3 ? (
                <button
                  type="button"
                  onClick={() => setShowProgressRankingsModal(true)}
                  className="tap-feedback mt-2 w-full rounded-lg py-1.5 text-left text-xs font-semibold text-amber-400 transition hover:text-amber-300 active:scale-[0.99]"
                >
                  See More →
                </button>
              ) : null}
            </>
          )}
        </div>
      </section>

      <div className="border-t border-zinc-800/60 pt-4" aria-hidden />

      <AdvancedStrengthAnalyticsSection />

      <div className="border-t border-zinc-800/60 pt-4" aria-hidden />

      {/* Monthly Analytics Dashboard — deferred (secondary content) */}
      {showDeferred && (
      <section className="transition-opacity duration-200">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Monthly analytics
        </h3>

        {/* Month selector */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-500">Month:</span>
          <select
            value={`${selectedMonth.year}-${selectedMonth.month}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setSelectedMonth({ year: y, month: m });
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1.5 text-sm text-zinc-200 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            aria-label="Select month"
          >
            {monthOptions.map((opt) => (
              <option
                key={`${opt.year}-${opt.month}`}
                value={`${opt.year}-${opt.month}`}
              >
                {new Date(opt.year, opt.month - 1).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>
        </div>

        {loadingMonthly && !monthlyAnalytics ? (
          <div className="space-y-3">
            <SkeletonPanel height="h-56" />
            <div className="grid grid-cols-2 gap-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                  <div className="animate-skeleton-pulse h-2.5 w-14 rounded bg-zinc-700/60" />
                  <div className="animate-skeleton-pulse mt-1 h-5 w-8 rounded bg-zinc-700/60" />
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
              <div className="animate-skeleton-pulse h-2.5 w-24 rounded bg-zinc-700/60" />
              <div className="animate-skeleton-pulse mt-1 h-5 w-12 rounded bg-zinc-700/60" />
            </div>
          </div>
        ) : !monthlyAnalytics || (monthlyAnalytics.totalSets === 0 && monthlyAnalytics.workoutsCompleted === 0) ? (
          <p className="rounded-lg bg-zinc-900/40 px-3 py-3 text-center text-sm text-zinc-500">
            No data for this month yet.
          </p>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {/* Donut chart */}
            <div>
              <p className="mb-1 text-xs text-zinc-500">
                Share of total sets per category
              </p>
              <MonthlyDonutChart
                data={monthlyAnalytics.donutData}
                totalSets={monthlyAnalytics.totalSets}
              />
            </div>

            {/* Summary metrics — compact 2×2 + strength change */}
            <div className="grid grid-cols-2 gap-2.5">
              <MetricCard
                label="Workouts"
                value={String(monthlyAnalytics.workoutsCompleted)}
              />
              <MetricCard
                label="Total Sets"
                value={String(monthlyAnalytics.totalSets)}
              />
              <MetricCard
                label="Exercises"
                value={String(monthlyAnalytics.exercisesUsed)}
              />
              <MetricCard label="PRs" value={String(monthlyAnalytics.prsHit)} />
            </div>
            <MetricCard
              label="Strength Change"
              value={
                monthlyAnalytics.strengthChangePct != null ? (
                  <span
                    className={
                      monthlyAnalytics.strengthChangePct >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  >
                    {monthlyAnalytics.strengthChangePct >= 0 ? "+" : ""}
                    {monthlyAnalytics.strengthChangePct}%
                  </span>
                ) : (
                  "—"
                )
              }
            />

            {/* Training balance */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Training Balance
              </h4>
              <p className="text-sm text-zinc-300">
                Upper Body — {monthlyAnalytics.trainingBalance.upperPct}%
                <span className="mx-2 text-zinc-600">·</span>
                Lower Body — {monthlyAnalytics.trainingBalance.lowerPct}%
              </p>
              <p
                className={`mt-1 text-sm ${
                  monthlyAnalytics.trainingBalance.isBalanced
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {monthlyAnalytics.trainingBalance.isBalanced ? "✔ " : "⚠ "}
                {monthlyAnalytics.trainingBalance.message}
              </p>
            </div>

            {/* Top exercise */}
            {monthlyAnalytics.topExercise && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Top Exercise
                </h4>
                <p className="text-base font-medium leading-tight text-zinc-100">
                  {monthlyAnalytics.topExercise.name}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-emerald-400">
                  Strength Gain: +{formatWeight(monthlyAnalytics.topExercise.strengthGainKg, { units })} {weightLabel}
                  estimated 1RM
                </p>
                <p className="text-xs text-zinc-500">Sessions: {monthlyAnalytics.topExercise.sessions}</p>
              </div>
            )}
          </div>
        )}
      </section>
      )}
    </div>
  );
}

const MetricCard = memo(function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-zinc-100">{value}</p>
      {sub != null && (
        <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>
      )}
    </div>
  );
});

function diffClass(diff: number): string {
  if (diff > 0) return "text-emerald-400";
  if (diff < 0) return "text-red-400";
  return "text-zinc-500";
}

const StrengthProgressChart = memo(function StrengthProgressChart({ data }: { data: OneRMPoint[] }) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);

  if (data.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-500">
        No 1RM data for this exercise
      </div>
    );
  }

  return (
    <div
      className="h-[200px] w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-2"
      style={{ minHeight: 200 }}
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
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
            tickFormatter={(v) => `${formatWeight(Number(v), { units })} ${weightLabel}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(value) => [value != null ? `${formatWeight(Number(value), { units })} ${weightLabel}` : "", "Est. 1RM"]}
            labelFormatter={(label) => (label ? new Date(label).toLocaleDateString() : "")}
          />
          <Line
            type="monotone"
            dataKey="estimated1RM"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: "#f59e0b", r: 3 }}
            activeDot={{ r: 4 }}
            animationDuration={0}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

/** Liftly donut palette: primary orange → lighter → golden → soft → dark amber. */
const DONUT_COLORS = [
  "#f59e0b", // primary orange (amber-500)
  "#fbbf24", // lighter orange (amber-400)
  "#fcd34d", // golden yellow (amber-300)
  "#fdba74", // soft orange (orange-300)
  "#d97706", // dark amber (amber-600)
  "#b45309", // amber-700 (extra if > 5 categories)
  "#ea580c", // orange-600
  "#c2410c", // orange-700
];

type MonthlyDonutSlice = { category: string; sets: number; percentage: number };

const DonutTooltipContent = memo(function DonutTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { sets: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const sets = p.payload?.sets ?? 0;
  const pct = p.value ?? 0;
  return (
    <div
      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm shadow-lg animate-fade-in"
      style={{ animationDuration: "0.15s" }}
    >
      <p className="font-medium text-zinc-100">{p.name}</p>
      <p className="text-zinc-400">{sets} sets</p>
      <p className="text-amber-400">{pct}% of training</p>
    </div>
  );
});

const MonthlyDonutChart = memo(function MonthlyDonutChart({
  data,
  totalSets,
}: {
  data: MonthlyDonutSlice[];
  totalSets: number;
}) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: d.category,
        value: d.percentage,
        sets: d.sets,
      })),
    [data]
  );

  if (data.length === 0) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-500">
        No training data for this month
      </div>
    );
  }

  const chartSize = 220;

  return (
    <div className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
      <div className="relative w-full" style={{ height: chartSize }}>
        <ResponsiveContainer width="100%" height={chartSize}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={82}
              paddingAngle={3}
              animationDuration={0}
              isAnimationActive={false}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip
              content={<DonutTooltipContent />}
              position={{ x: 0, y: 0 }}
              wrapperStyle={{ outline: "none" }}
              animationDuration={150}
              animationEasing="ease-out"
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label: total sets (inside chart area so it aligns with donut hole) */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-zinc-100">
            {totalSets}
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Total Sets
          </span>
        </div>
      </div>
      <div className="mt-2 space-y-0.5 text-xs leading-snug text-zinc-400">
        {data.map((d, i) => (
          <div key={d.category} className="flex items-baseline gap-1.5">
            <span
              className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
              aria-hidden
            />
            <span>
              {d.category} • {d.sets} sets • {d.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

