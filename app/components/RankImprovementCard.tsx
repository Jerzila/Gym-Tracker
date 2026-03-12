"use client";

import { useMemo, useState } from "react";
import { RankBadge } from "@/app/components/RankBadge";
import { RankLadderPanel } from "@/app/components/RankLadderPanel";
import { getProgressToNextTier } from "@/lib/rankBadges";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";
import type { StrengthRankMuscle } from "@/lib/strengthRanking";
import type { StrengthRankingWithExercises } from "@/app/actions/strengthRanking";

const MUSCLE_LABELS: Record<StrengthRankMuscle, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  arms: "Arms",
};

/** Model: percentile = 100 * (score/elite)^0.7 => score ratio for target vs current = (targetPct/currentPct)^(1/0.7). */
const EXPONENT_INV = 1 / 0.7;

/**
 * Estimated additional weight (kg) on the best exercise for this muscle to reach target percentile.
 * Uses model inverse: (targetPct/currentPct)^(1/0.7) * current1RM - current1RM.
 */
function addKgForNextRank(
  currentPercentile: number,
  targetPercentile: number,
  current1RMKg: number
): number {
  if (current1RMKg <= 0 || currentPercentile < 1) return targetPercentile > currentPercentile ? 5 : 0;
  if (targetPercentile <= currentPercentile) return 0;
  const ratio = Math.pow(targetPercentile / Math.max(1, currentPercentile), EXPONENT_INV);
  const add = current1RMKg * (ratio - 1);
  return Math.max(0, Math.round(add * 10) / 10);
}

type Props = {
  data: StrengthRankingWithExercises;
};

/**
 * Progression guide: next rank badge, top 3 limiting muscles, and weight targets
 * (estimated additional weight on strongest exercise per muscle to reach next rank).
 */
export function RankImprovementCard({ data }: Props) {
  const units = useUnits();
  const [ladderOpen, setLadderOpen] = useState(false);

  const content = useMemo(() => {
    const { nextLabel, nextRank, nextTier, tierEnd } = getProgressToNextTier(data.overallPercentile);
    const targetPct = tierEnd;
    const muscles = ["chest", "back", "legs", "shoulders", "arms"] as const;
    const best = data.bestExerciseByMuscle;

    const withTarget = muscles
      .map((m) => {
        const currentPct = data.musclePercentiles[m] ?? 0;
        const gap = Math.max(0, targetPct - currentPct);
        const bestEx = best[m];
        const current1RM = bestEx?.estimated1RM ?? 0;
        const addKg = addKgForNextRank(currentPct, targetPct, current1RM);
        return {
          muscle: m,
          label: MUSCLE_LABELS[m],
          exerciseName: bestEx?.name ?? MUSCLE_LABELS[m],
          addKg,
          gap,
        };
      })
      .filter((x) => x.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3);

    return { nextLabel, nextRank, nextTier, limiting: withTarget };
  }, [data]);

  const weightLabel = weightUnitLabel(units);

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <RankBadge rank={content.nextRank} tier={content.nextTier} size={80} />
          <p className="text-sm font-semibold text-zinc-200">
            Next Rank: {content.nextLabel}
          </p>
        </div>

        {content.limiting.length === 0 ? (
          <p className="text-sm text-emerald-400/90">
            All muscle groups are at or above the next rank threshold.
          </p>
        ) : (
          <ul className="space-y-3">
            {content.limiting.map(({ muscle, label, exerciseName, addKg }) => (
              <li key={muscle} className="border-t border-zinc-800/80 pt-2 first:border-t-0 first:pt-0">
                <p className="font-semibold text-zinc-100">{label}</p>
                <p className="mt-0.5 flex items-baseline justify-between gap-2 text-sm text-zinc-400">
                  <span>{exerciseName}</span>
                  <span className="shrink-0 font-medium text-amber-400">
                    {formatWeight(addKg, { units, signed: true })} {weightLabel}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}

        {content.limiting.length > 0 && (
          <p className="text-xs text-zinc-500">
            Improve these lifts to reach {content.nextLabel}
          </p>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => setLadderOpen(true)}
          className="tap-feedback inline-flex items-center gap-1 text-sm font-semibold text-amber-500 underline decoration-amber-500/50 underline-offset-2 hover:text-amber-400 hover:decoration-amber-400"
        >
          See All Ranks
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>

      <RankLadderPanel
        isOpen={ladderOpen}
        onClose={() => setLadderOpen(false)}
        overallPercentile={data.overallPercentile}
      />
    </div>
  );
}
