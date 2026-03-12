"use client";

import { useMemo } from "react";
import Image from "next/image";
import { getRank, getProgressToNextTier } from "@/lib/rankBadges";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";
import type { RankSlug } from "@/lib/rankBadges";
import type { StrengthRankMuscle } from "@/lib/strengthRanking";
import type { StrengthRankingWithExercises } from "@/app/actions/strengthRanking";

const STRENGTH_MUSCLE_ORDER: StrengthRankMuscle[] = ["chest", "back", "legs", "shoulders", "arms"];
const MUSCLE_LABELS: Record<StrengthRankMuscle, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  arms: "Arms",
};

/** Total additional weight (kg) on best exercise to reach target percentile. */
const EXPONENT_INV = 1 / 0.7;
function totalAddKgForNextRank(
  currentPercentile: number,
  targetPercentile: number,
  best1RMKg: number
): number {
  if (best1RMKg <= 0 || currentPercentile < 1) return targetPercentile > currentPercentile ? 5 : 0;
  if (targetPercentile <= currentPercentile) return 0;
  const ratio = Math.pow(targetPercentile / Math.max(1, currentPercentile), EXPONENT_INV);
  const add = best1RMKg * (ratio - 1);
  return Math.max(0, Math.round(add * 10) / 10);
}

/** Per-exercise increase: required1RM - current1RM, clamped to minimum 1 kg for display. */
function requiredIncreaseKg(required1RM: number, current1RM: number): number {
  const raw = Math.max(0, Math.round((required1RM - current1RM) * 10) / 10);
  return raw < 1 ? 1 : raw;
}

type Props = {
  data: StrengthRankingWithExercises;
};

export function MuscleRankList({ data }: Props) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);

  const { rows, nextLabel, isGoat } = useMemo(() => {
    const progress = getProgressToNextTier(data.overallPercentile);
    const currentRank = getRank(data.overallPercentile);
    const goat = currentRank.rank === "goat";
    const topByMuscle = data.topExercisesByMuscle ?? {
      chest: [], back: [], legs: [], shoulders: [], arms: [],
    };

    const rows = STRENGTH_MUSCLE_ORDER.map((muscle) => {
      const pct = data.musclePercentiles[muscle];
      const rankInfo = data.muscleRanks[muscle];
      const r = getRank(pct);
      const topPct = 100 - pct;
      const topLabel = pct >= 99 ? "Top 1%" : pct >= 90 ? "Top 10%" : `Top ${Math.round(topPct)}%`;
      const topList = topByMuscle[muscle] ?? [];
      const exercises = topList.length > 0 ? topList : (data.bestExerciseByMuscle[muscle] ? [data.bestExerciseByMuscle[muscle]!] : []);
      const best1RM = exercises[0]?.estimated1RM ?? 0;
      const totalAddKg = totalAddKgForNextRank(pct, progress.tierEnd, best1RM);
      const required1RM = best1RM + totalAddKg;
      const exercisesWithAdd = exercises.slice(0, 3).map((ex) => ({
        name: ex.name,
        addKg: requiredIncreaseKg(required1RM, ex.estimated1RM),
      }));

      return {
        muscle,
        label: MUSCLE_LABELS[muscle],
        rank: r.rank as RankSlug,
        tier: r.tier,
        rankLabel: rankInfo.rankLabel,
        topLabel,
        exercisesWithAdd,
      };
    });

    return { rows, nextLabel: progress.nextLabel, isGoat: goat };
  }, [data]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Muscle Strength Rankings
      </h2>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li
            key={row.muscle}
            className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2.5"
          >
            <Image
              src={`/${row.rank || "newbie"}.png`}
              alt={row.rankLabel}
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 object-contain"
              unoptimized
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-zinc-100">{row.label}</p>
              <p className="text-sm text-zinc-400">
                {row.rankLabel} · {row.topLabel}
              </p>
              {isGoat ? (
                <p className="mt-1 text-sm text-zinc-500">All lifts maxed</p>
              ) : row.exercisesWithAdd.length > 0 ? (
                <>
                  <ul className="mt-1.5 space-y-1 text-sm text-zinc-400">
                    {row.exercisesWithAdd.map(({ name, addKg }) => (
                      <li key={name} className="flex items-baseline justify-between gap-2">
                        <span>{name}</span>
                        <span className="shrink-0 font-semibold text-amber-500">
                          {formatWeight(addKg, { units, signed: true })} {weightLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-zinc-500">
                    Improve any of these lifts to reach {nextLabel}.
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-zinc-500">
                  No strength data yet
                  <br />
                  <span className="text-xs">Log {row.label.toLowerCase()} exercises to start ranking.</span>
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
