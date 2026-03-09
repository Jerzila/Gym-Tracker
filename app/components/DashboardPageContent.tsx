"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { formatWeight } from "@/lib/formatWeight";
import { SkeletonPanel } from "@/app/components/Skeleton";
import type { WeeklyComparison } from "@/app/actions/insights";

const MuscleRadarChart = dynamic(
  () =>
    import("@/app/components/MuscleRadarChart").then((m) => ({
      default: m.MuscleRadarChart,
    })),
  { ssr: false, loading: () => <SkeletonPanel height="h-[220px]" /> }
);

const MuscleHeatmap = dynamic(
  () =>
    import("@/app/components/MuscleHeatmap").then((m) => ({
      default: m.MuscleHeatmap,
    })),
  { ssr: false, loading: () => <SkeletonPanel height="h-32" /> }
);

const BodyweightSparkline = dynamic(
  () =>
    import("@/app/components/BodyweightSparkline").then((m) => ({
      default: m.BodyweightSparkline,
    })),
  { ssr: false, loading: () => <div className="mt-3 h-14 w-full rounded-lg bg-zinc-800/50 animate-skeleton-pulse" /> }
);
import type { CategoryDistribution, MuscleDistributionPoint, MuscleHeatmapPoint } from "@/app/actions/insights";
import type { LastWorkoutSummary } from "@/app/actions/workouts";

type BodyweightStats = {
  latest: { weight: number; date: string } | null;
  diffFromPrevious: number | null;
};

type SparklinePoint = { date: string; weight: number };

type Props = {
  weekly: WeeklyComparison | null;
  bodyweightStats: BodyweightStats;
  bodyweightSparkline: SparklinePoint[];
  lastWorkout: LastWorkoutSummary | null;
  categoryDistribution: CategoryDistribution | null;
  muscleDistribution: MuscleDistributionPoint[] | null;
  muscleHeatmapData: MuscleHeatmapPoint[];
  gender?: "male" | "female";
};

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DashboardPageContent({
  weekly,
  bodyweightStats,
  bodyweightSparkline,
  lastWorkout,
  categoryDistribution,
  muscleDistribution,
  muscleHeatmapData,
  gender = "male",
}: Props) {
  const workoutsThisWeek = weekly?.thisWeek.workouts ?? 0;
  const workoutsLastWeek = weekly?.lastWeek.workouts ?? 0;
  const ahead = weekly && !weekly.noLastWeekData ? weekly.workoutsDiff > 0 : false;
  const weekProgress = weekly?.weekProgress ?? 0;

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 pb-24 pt-6 sm:px-6">
      {/* Log Workout — primary CTA */}
      <section className="animate-fade-in">
        <Link
          href="/exercises?log=1"
          prefetch={true}
          className="tap-feedback flex w-full items-center justify-center rounded-xl bg-amber-500 px-6 py-4 text-base font-semibold text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 hover:shadow-amber-500/25 active:scale-[0.99]"
        >
          Log Workout
        </Link>
      </section>

      {/* Weekly Progress */}
      <section className="animate-fade-in" style={{ animationDelay: "50ms" }}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700">
          <h2 className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Weekly Progress
          </h2>
          <p className="text-2xl font-bold text-zinc-100">
            {workoutsThisWeek} workout{workoutsThisWeek !== 1 ? "s" : ""}
          </p>
          {weekly && !weekly.noLastWeekData && (
            <p
              className={`mt-1 text-sm ${ahead ? "text-emerald-400" : workoutsThisWeek >= workoutsLastWeek ? "text-zinc-400" : "text-amber-400"}`}
            >
              {ahead ? "Ahead of last week" : workoutsThisWeek >= workoutsLastWeek ? "On track" : "Behind last week"}
            </p>
          )}
          {weekly && (weekly.noLastWeekData || weekly.weekJustStarted) && (
            <p className="mt-1 text-sm text-zinc-500">Start logging to see progress</p>
          )}
          {weekProgress > 0 && weekProgress < 1 && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, weekProgress * 100)}%` }}
              />
            </div>
          )}
        </div>
      </section>

      {/* Bodyweight */}
      <section className="animate-fade-in" style={{ animationDelay: "100ms" }}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Bodyweight
          </h2>
          {bodyweightStats.latest ? (
            <>
              <p className="text-2xl font-bold text-zinc-100">
                {formatWeight(bodyweightStats.latest.weight)} kg
              </p>
              {bodyweightStats.diffFromPrevious != null && (
                <p
                  className={`mt-1 flex items-center gap-1 text-sm ${
                    bodyweightStats.diffFromPrevious <= 0 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {bodyweightStats.diffFromPrevious <= 0 ? "↓" : "↑"}{" "}
                  {formatWeight(Math.abs(bodyweightStats.diffFromPrevious), { signed: true })} kg vs
                  previous
                </p>
              )}
              {bodyweightSparkline.length > 0 && (
                <BodyweightSparkline data={bodyweightSparkline} />
              )}
              <Link
                href="/bodyweight"
                prefetch={true}
                className="mt-3 inline-flex items-center rounded-lg border border-zinc-600 bg-transparent px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              >
                + Log Weight
              </Link>
            </>
          ) : (
            <>
              <p className="text-zinc-500">No weight logged yet</p>
              <Link
                href="/bodyweight"
                prefetch={true}
                className="mt-3 inline-flex items-center rounded-lg bg-amber-500/20 px-3 py-2 text-sm font-medium text-amber-400 transition hover:bg-amber-500/30"
              >
                + Log Weight
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Last Workout */}
      <section className="animate-fade-in" style={{ animationDelay: "150ms" }}>
        <Link href="/calendar" prefetch={true} className="block">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/70">
            <h2 className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Last Workout
            </h2>
            {lastWorkout && lastWorkout.exerciseCount > 0 ? (
              <>
                <p className="text-lg font-semibold text-zinc-100">{lastWorkout.title}</p>
                <p className="mt-0.5 text-sm text-zinc-400">
                  {lastWorkout.exerciseCount} exercise{lastWorkout.exerciseCount !== 1 ? "s" : ""}
                  {lastWorkout.prHit && (
                    <span className="ml-2 text-amber-400">· PR hit</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{formatShortDate(lastWorkout.date)}</p>
              </>
            ) : (
              <p className="text-zinc-500">No workouts yet. Log your first above.</p>
            )}
          </div>
        </Link>
      </section>

      {/* Muscle Activity — heatmap preview (This Week only); tap navigates to Insights heatmap */}
      <section className="animate-fade-in" style={{ animationDelay: "200ms" }}>
        <Link href="/insights#muscle-distribution" prefetch={true} className="block group">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/70">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Muscle Activity
            </h2>
            <MuscleHeatmap
              data={muscleHeatmapData}
              gender={gender}
              compact
              emptyMessage="No muscle data yet. Log workouts to see your training distribution."
            />
            <p className="mt-3 text-center text-sm text-amber-400 transition group-hover:text-amber-300">
              View detailed insights →
            </p>
          </div>
        </Link>
      </section>

      {/* Training Balance (Radar) Preview */}
      <section className="animate-fade-in" style={{ animationDelay: "250ms" }}>
        <Link href="/insights" prefetch={true} className="block">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/70">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Training Balance
            </h2>
            {categoryDistribution?.current?.length ? (
              <div className="min-h-[220px] w-full overflow-hidden rounded-lg">
                <MuscleRadarChart
                  range="this_week"
                  current={categoryDistribution.current}
                  previous={categoryDistribution.previous}
                />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/30 text-sm text-zinc-500">
                Log workouts to see distribution
              </div>
            )}
            <p className="mt-2 text-center text-xs text-zinc-500">Tap for full Insights</p>
          </div>
        </Link>
      </section>
    </div>
  );
}
