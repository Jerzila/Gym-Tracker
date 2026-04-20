"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";
import { SkeletonPanel } from "@/app/components/Skeleton";
import type { WeeklyComparison } from "@/app/actions/insights";
import type { StrengthRankingWithExercises } from "@/app/actions/strengthRanking";
import { overallRankDisplayFromOutput } from "@/lib/strengthRanking";
import { appHref } from "@/lib/appRoutes";

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

const FriendsLeaderboard = dynamic(
  () =>
    import("@/app/components/FriendsLeaderboard").then((m) => ({
      default: m.FriendsLeaderboard,
    })),
  { ssr: false, loading: () => <SkeletonPanel height="h-[200px]" /> }
);

const WeeklyProgressWidget = dynamic(
  () =>
    import("@/app/components/WeeklyProgressWidget").then((m) => ({
      default: m.WeeklyProgressWidget,
    })),
  { ssr: false }
);

import { calculateBMI, getBMICategory } from "@/lib/bmi";
import { getFFMICategory } from "@/lib/ffmi";
import { BMISlider } from "@/app/components/BMISlider";
import { FFMICalculateModal } from "@/app/components/FFMICalculateModal";
import { CalculatorIcon } from "@/components/icons";
import type { MuscleBalanceRadarDistribution, MuscleDistributionPoint } from "@/app/actions/insights";
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
  /** From profile after user runs FFMI calculator; omit to hide FFMI on the card */
  storedFfmi: number | null;
  initialBodyFatPercent: number | null;
  lastWorkout: LastWorkoutSummary | null;
  muscleBalanceRadar: MuscleBalanceRadarDistribution | null;
  muscleDistribution: MuscleDistributionPoint[] | null;
  gender?: "male" | "female";
  strengthRanking: StrengthRankingWithExercises | null;
};

export function DashboardPageContent({
  weekly,
  bodyweightStats,
  profileWeightKg,
  heightCm,
  storedFfmi,
  initialBodyFatPercent,
  lastWorkout,
  muscleBalanceRadar,
  muscleDistribution,
  gender = "male",
  strengthRanking,
}: Props) {
  const router = useRouter();
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  const weightKg = bodyweightStats.latest?.weight ?? profileWeightKg ?? null;
  const [ffmiModalOpen, setFfmiModalOpen] = useState(false);

  const bmi =
    weightKg != null && heightCm != null && heightCm > 0
      ? calculateBMI(weightKg, heightCm)
      : null;
  const bmiCategory = bmi != null ? getBMICategory(bmi) : null;
  const ffmiCategory = storedFfmi != null ? getFFMICategory(storedFfmi, gender) : null;
  const cardTitle =
    storedFfmi != null ? "Bodyweight · BMI · FFMI" : "Bodyweight · BMI";

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 pb-24 pt-6 sm:px-6">
      {/* Log Workout — primary CTA */}
      <section className="animate-fade-in">
        <Link
          href={`${appHref("/exercises")}?log=1`}
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
          <DashboardRankWidget
            display={overallRankDisplayFromOutput(strengthRanking)}
          />
        ) : (
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <h2 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Overall Rank
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
            {cardTitle}
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
              {bmi == null || bmiCategory == null ? (
                <p className="mt-3 text-sm text-zinc-500">Add your height in settings to see BMI.</p>
              ) : (
                <div className="mt-3 w-full">
                  <p className="mb-1 flex flex-wrap items-baseline gap-2">
                    <span className="text-base font-semibold tabular-nums text-zinc-100">{bmi}</span>
                    <span className="text-xs font-medium" style={{ color: bmiCategory.color }}>
                      {bmiCategory.label}
                    </span>
                  </p>
                  <BMISlider bmi={bmi} compact />
                </div>
              )}
              {storedFfmi != null && ffmiCategory != null ? (
                <p className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium text-zinc-500">FFMI:</span>
                  <span className="text-xl font-semibold tabular-nums text-zinc-100">{storedFfmi}</span>
                  <span className="text-sm font-medium" style={{ color: ffmiCategory.color }}>
                    {ffmiCategory.label}
                  </span>
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={appHref("/bodyweight")}
                  prefetch={true}
                  className="inline-flex items-center rounded-lg border border-zinc-600 bg-transparent px-2.5 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  + Log Weight
                </Link>
                {bmi != null && bmiCategory != null && heightCm != null && weightKg != null ? (
                  <button
                    type="button"
                    onClick={() => setFfmiModalOpen(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-amber-500 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-200 shadow-[0_0_0_1px_rgba(245,158,11,0.35)] transition hover:border-amber-400 hover:bg-zinc-800 hover:text-zinc-50"
                    aria-label="Calculate FFMI"
                  >
                    <CalculatorIcon size={16} className="text-amber-400" aria-hidden />
                    FFMI
                  </button>
                ) : null}
              </div>
              <FFMICalculateModal
                open={ffmiModalOpen}
                onClose={() => setFfmiModalOpen(false)}
                heightCm={heightCm ?? 0}
                weightKg={weightKg ?? 0}
                initialBodyFatPercent={initialBodyFatPercent}
                gender={gender}
              />
            </>
          ) : (
            <>
              <p className="text-zinc-500">No weight logged yet</p>
              <Link
                href={appHref("/bodyweight")}
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

      {/* Training Balance — This week only (free); other ranges are Pro on Insights */}
      <section className="animate-fade-in" style={{ animationDelay: "125ms" }}>
        <div className="relative">
          <div
            className="absolute inset-0 z-[5] cursor-pointer rounded-xl tap-feedback"
            onClick={() => router.push(appHref("/insights"))}
          />

          <div className="relative z-10 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700 hover:bg-zinc-900/70">
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Training Balance
            </h2>
            {muscleBalanceRadar ? (
              <div
                className="min-h-[160px] w-full overflow-hidden rounded-lg"
                onClickCapture={(e) => e.stopPropagation()}
              >
                <MuscleRadarChart range="this_week" distribution={muscleBalanceRadar} />
              </div>
            ) : (
              <div className="flex h-28 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/30 text-xs text-zinc-500">
                Log workouts to see distribution
              </div>
            )}
            <p
              className="mt-1.5 cursor-pointer text-center text-[11px] text-zinc-500"
              onClick={() => router.push(appHref("/insights"))}
            >
              Tap for full Insights (more ranges are Pro)
            </p>
          </div>
        </div>
      </section>

      {/* Friends leaderboard (same widget as Social) */}
      <section className="animate-fade-in" style={{ animationDelay: "150ms" }}>
        <FriendsLeaderboard />
      </section>
    </div>
  );
}
