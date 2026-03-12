"use client";

import { useMemo } from "react";
import { RankBadge } from "@/app/components/RankBadge";
import { getRank } from "@/lib/rankBadges";
import type { RankSlug } from "@/lib/rankBadges";
import type { StrengthRankMuscle } from "@/lib/strengthRanking";
import type { StrengthRankingWithExercises } from "@/app/actions/strengthRanking";

const MUSCLE_LABELS: Record<StrengthRankMuscle, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  arms: "Arms",
};

type Props = {
  data: StrengthRankingWithExercises;
};

export function WeakestMuscleCard({ data }: Props) {
  const weakest = useMemo(() => {
    let minPct = 101;
    let minMuscle: StrengthRankMuscle | null = null;
    for (const m of ["chest", "back", "legs", "shoulders", "arms"] as const) {
      const pct = data.musclePercentiles[m];
      if (pct < minPct) {
        minPct = pct;
        minMuscle = m;
      }
    }
    if (minMuscle == null) return null;
    const rankInfo = data.muscleRanks[minMuscle];
    const r = getRank(minPct);
    return {
      muscle: minMuscle,
      label: MUSCLE_LABELS[minMuscle],
      rank: r.rank as RankSlug,
      tier: r.tier,
      rankLabel: rankInfo.rankLabel,
    };
  }, [data]);

  if (!weakest) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Weakest Muscle
      </h2>
      <div className="flex items-center gap-4">
        <RankBadge rank={weakest.rank} tier={weakest.tier} size={64} />
        <div>
          <p className="font-semibold text-zinc-100">{weakest.label}</p>
          <p className="text-sm text-zinc-400">{weakest.rankLabel}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Train {weakest.label.toLowerCase()} to improve overall rank.
          </p>
        </div>
      </div>
    </div>
  );
}
