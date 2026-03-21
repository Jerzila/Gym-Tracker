"use client";

import { useMemo } from "react";
import Image from "next/image";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";
import type { RankSlug } from "@/lib/rankBadges";
import type { StrengthRankMuscle } from "@/lib/strengthRanking";
import type { StrengthRankingWithExercises } from "@/app/actions/strengthRanking";

const MUSCLE_LABELS: Record<StrengthRankMuscle, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  traps: "Traps",
  core: "Core",
};


type Props = {
  data: StrengthRankingWithExercises;
};

export function MuscleRankList({ data }: Props) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);

  const { rows, nextLabel, isGoat } = useMemo(() => {
    const nextLabel = data.overallNextRankLabel ?? "";
    const goat = data.overallRankSlug === "goat";
    const suggestionsByMuscle = data.improvementSuggestionsByMuscle ?? {};
    const visible = (data.visibleMuscles?.length
      ? data.visibleMuscles
      : (["chest", "back", "legs", "shoulders", "biceps", "triceps"] as StrengthRankMuscle[]));

    const topByMuscle = data.topExercisesByMuscle ?? ({} as Record<StrengthRankMuscle, { name: string; estimated1RM: number }[]>);
    const rows = visible.map((muscle) => {
      const exerciseCount = data.exerciseCountByMuscle?.[muscle] ?? 0;
      const isEmpty = (muscle === "core" || muscle === "forearms") && exerciseCount === 0;
      const rankInfo = data.muscleRanks[muscle];
      const topLabel = `${rankInfo.topPercentileLabel} of lifters`;
      const isCore = muscle === "core";
      const weightSuggestions = isCore ? [] : (suggestionsByMuscle[muscle] ?? []);
      const coreSuggestions = isCore ? (data.coreImprovementSuggestions ?? []) : [];
      const topExercises = topByMuscle[muscle] ?? [];
      const hasStrengthData = topExercises.length > 0 || (data.muscleScores?.[muscle] ?? 0) > 0;

      return {
        muscle,
        label: MUSCLE_LABELS[muscle],
        isEmpty,
        rank: rankInfo.rankSlug as RankSlug,
        tier: rankInfo.tier,
        rankLabel: rankInfo.rankLabel,
        progressToNextPct: rankInfo.progressToNextPct ?? 0,
        nextRankLabel: rankInfo.nextRankLabel ?? null,
        topLabel,
        weightSuggestions,
        coreSuggestions,
        topExercises,
        hasStrengthData,
      };
    });

    return { rows, nextLabel, isGoat: goat };
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
            {!row.isEmpty && (
              <Image
                src={`/${row.rank || "newbie"}.png`}
                alt={row.rankLabel}
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 object-contain"
                unoptimized
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-zinc-100">{row.label}</p>
              {row.isEmpty ? (
                <p className="text-sm text-zinc-500">No strength data yet</p>
              ) : (
                <>
                  <p className="text-sm text-zinc-400">
                    {row.rankLabel} · {row.topLabel}
                  </p>
                  {row.nextRankLabel && row.progressToNextPct < 100 && (
                    <p className="text-xs text-zinc-500">
                      {row.progressToNextPct}% progress to {row.nextRankLabel}
                    </p>
                  )}
                </>
              )}
              {isGoat ? (
                <p className="mt-1 text-sm text-zinc-500">All lifts maxed</p>
              ) : row.isEmpty ? (
                <p className="mt-1 text-sm text-zinc-500">
                  Log exercises in {row.label} to see your rank.
                </p>
              ) : row.muscle === "core" ? (
                row.coreSuggestions.length > 0 ? (
                  <>
                    <ul className="mt-1.5 space-y-1 text-sm text-zinc-400">
                      {row.coreSuggestions.slice(0, 3).map(({ name, improvementLabel }) => (
                        <li key={name} className="flex items-baseline justify-between gap-2">
                          <span>{name}</span>
                          <span className="shrink-0 font-semibold text-amber-500">
                            {improvementLabel}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-zinc-500">
                      Improve any of these to climb core ranks.
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-zinc-500">
                    No core workouts logged yet
                    <br />
                    <span className="text-xs">Log core workouts to start ranking.</span>
                  </p>
                )
              ) : row.weightSuggestions.length > 0 ? (
                <>
                  <ul className="mt-1.5 space-y-1 text-sm text-zinc-400">
                    {row.weightSuggestions.map((s) => (
                      <li key={s.exerciseId} className="flex items-baseline justify-between gap-2">
                        <span>{s.exerciseName}</span>
                        <span className="shrink-0 font-semibold text-amber-500">
                          {formatWeight(s.increaseKg, { units, signed: true })} {weightLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-zinc-500">
                    Improve any of these to reach {row.nextRankLabel ?? nextLabel}.
                  </p>
                </>
              ) : row.hasStrengthData ? (
                row.topExercises.length > 0 ? (
                  <>
                    <ul className="mt-1.5 space-y-1 text-sm text-zinc-400">
                      {row.topExercises.slice(0, 3).map((ex) => (
                        <li key={ex.name} className="flex items-baseline justify-between gap-2">
                          <span>{ex.name}</span>
                          <span className="shrink-0 font-medium text-zinc-500">
                            {formatWeight(ex.estimated1RM, { units })} {weightLabel} 1RM
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-zinc-500">
                      Keep pushing these lifts to reach {row.nextRankLabel ?? nextLabel}.
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-zinc-500">
                    Keep training {row.label.toLowerCase()} to reach {row.nextRankLabel ?? nextLabel}.
                  </p>
                )
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
