"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";
import { SkeletonPanel } from "@/app/components/Skeleton";
import type { WeeklyComparison } from "@/app/actions/insights";
import type { StrengthRankingWithExercises } from "@/app/actions/strengthRanking";

const MuscleRadarChart = dynamic(
  () =>
    import("@/app/components/MuscleRadarChart").then((m) => ({
      default: m.MuscleRadarChart,
    })),
  { ssr: false, loading: () => <SkeletonPanel height="h-[220px]" /> }
);

const DashboardMusclePreview = dynamic(
  () =>
    import("@/app/components/DashboardMusclePreview").then((m) => ({
      default: m.DashboardMusclePreview,
    })),
  { ssr: false, loading: () => <SkeletonPanel height="h-32" /> }
);

const DashboardRankWidget = dynamic(
  () =>
    import("@/app/components/DashboardRankWidget").then((m) => ({
      default: m.DashboardRankWidget,
    })),
  { ssr: false }
);

const WeeklyProgressWidget = dynamic(
  () =>
    import("@/app/components/WeeklyProgressWidget").then((m) => ({
      default: m.WeeklyProgressWidget,
    })),
  { ssr: false }
);

import { calculateBMI, getBMICategory, getBMIPosition, BMI_BAR_SEGMENTS } from "@/lib/bmi";
import type { CategoryDistribution, MuscleDistributionPoint } from "@/app/actions/insights";
import type { LastWorkoutSummary } from "@/app/actions/workouts";

type BodyweightStats = {
  latest: { weight: number; date: string } | null;
  diffFromPrevious: number | null;
};

type Props = {
  weekly: WeeklyComparison | null;
  bodyweightStats: BodyweightStats;
  /** Fallback weight from profile when user has no bodyweight logs */
  profileWeightKg: number | null;
  heightCm: number | null;
  lastWorkout: LastWorkoutSummary | null;
  categoryDistribution: CategoryDistribution | null;
  muscleDistribution: MuscleDistributionPoint[] | null;
  gender?: "male" | "female";
  strengthRanking: StrengthRankingWithExercises | null;
};

export function DashboardPageContent({
  weekly,
  bodyweightStats,
  profileWeightKg,
  heightCm,
  lastWorkout,
  categoryDistribution,
  muscleDistribution,
  gender = "male",
  strengthRanking,
}: Props) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  const weightKg = bodyweightStats.latest?.weight ?? profileWeightKg ?? null;

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 pb-24 pt-6 sm:px-6">
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

      {/* Two widgets side-by-side: Weekly Progress | Your Rank */}
      <section className="animate-fade-in grid grid-cols-2 gap-3 items-stretch" style={{ animationDelay: "25ms" }}>
        <WeeklyProgressWidget weekly={weekly} lastWorkout={lastWorkout} />
        {strengthRanking ? (
          <DashboardRankWidget overallPercentile={strengthRanking.overallPercentile} />
        ) : (
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <h2 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Your Rank
            </h2>
            <div className="flex flex-1 items-center">
              <p className="text-xs text-zinc-500">
                Log bodyweight and workouts to see your rank.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Bodyweight */}
      <section className="animate-fade-in" style={{ animationDelay: "50ms" }}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700">
          <h2 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Bodyweight · BMI
          </h2>
          {weightKg != null ? (
            <>
              <p className="text-xl font-bold text-zinc-100">
                {formatWeight(weightKg, { units })} {weightLabel}
              </p>
              {bodyweightStats.diffFromPrevious != null && (
                <p
                  className={`mt-0.5 flex items-center gap-1 text-xs ${
                    bodyweightStats.diffFromPrevious <= 0 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {bodyweightStats.diffFromPrevious <= 0 ? "↓" : "↑"}{" "}
                  {formatWeight(Math.abs(bodyweightStats.diffFromPrevious), { units, signed: true })} {weightLabel} vs
                  previous
                </p>
              )}
              {(() => {
                const bmi =
                  weightKg != null && heightCm != null && heightCm > 0
                    ? calculateBMI(weightKg, heightCm)
                    : null;
                const category = bmi != null ? getBMICategory(bmi) : null;
                if (bmi == null || category == null) {
                  return (
                    <p className="mt-3 text-sm text-zinc-500">Add your height in settings to see BMI.</p>
                  );
                }
                const position = getBMIPosition(bmi);
                return (
                  <div className="mt-3 w-full">
                    <p className="mb-1.5 flex flex-wrap items-baseline gap-2">
                      <span className="text-base font-semibold tabular-nums text-zinc-100">{bmi}</span>
                      <span className="text-xs font-medium" style={{ color: category.color }}>
                        {category.label}
                      </span>
                    </p>
                    <div className="mb-0.5 flex justify-between text-[11px] text-zinc-500">
                      <span>18.5</span>
                      <span>25</span>
                      <span>30</span>
                    </div>
                    <div className="relative flex h-2.5 w-full overflow-hidden rounded-full">
                      {BMI_BAR_SEGMENTS.map((seg) => (
                        <div
                          key={seg.label}
                          className="h-full flex-shrink-0"
                          style={{ width: `${seg.widthPercent}%`, backgroundColor: seg.color }}
                          title={seg.label}
                        />
                      ))}
                      <div
                        className="absolute -top-1 h-4 w-4 rounded-full border-2 border-zinc-900 bg-white shadow"
                        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
                        title={`BMI ${bmi}`}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
                      <span>Underweight</span>
                      <span>Normal</span>
                      <span>Overweight</span>
                      <span>Obese</span>
                    </div>
                  </div>
                );
              })()}
              <Link
                href="/bodyweight"
                prefetch={true}
                className="mt-2 inline-flex items-center rounded-lg border border-zinc-600 bg-transparent px-2.5 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
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
                className="mt-2 inline-flex items-center rounded-lg bg-amber-500/20 px-2.5 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-500/30"
              >
                + Log Weight
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Muscle Strength — compact diagram by rank; tap navigates to Insights #muscle-strength */}
      <section className="animate-fade-in" style={{ animationDelay: "100ms" }}>
        <DashboardMusclePreview data={strengthRanking} gender={gender} />
      </section>

      {/* Training Balance (Radar) Preview */}
      <section className="animate-fade-in" style={{ animationDelay: "125ms" }}>
        <Link href="/insights" prefetch={true} className="block">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700 hover:bg-zinc-900/70">
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Training Balance
            </h2>
            {categoryDistribution?.current?.length ? (
              <div className="min-h-[160px] w-full overflow-hidden rounded-lg">
                <MuscleRadarChart
                  range="this_week"
                  current={categoryDistribution.current}
                  previous={categoryDistribution.previous}
                />
              </div>
            ) : (
              <div className="flex h-28 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/30 text-xs text-zinc-500">
                Log workouts to see distribution
              </div>
            )}
            <p className="mt-1.5 text-center text-[11px] text-zinc-500">Tap for full Insights</p>
          </div>
        </Link>
      </section>
    </div>
  );
}
