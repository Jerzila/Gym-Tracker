"use client";

import { useMemo } from "react";
import Image from "next/image";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { formatDurationClock } from "@/lib/formatDuration";
import { useUnits } from "@/app/components/UnitsContext";
import type { BestExerciseByMuscle } from "@/app/actions/strengthRanking";
import type { RankSlug } from "@/lib/rankBadges";
import type { StrengthRankMuscle, WeightIncreaseSuggestion } from "@/lib/strengthRanking";
import type { CoreImprovementSuggestion, StrengthRankingWithExercises } from "@/app/actions/strengthRanking";

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

function formatTopExerciseValue(
  ex: BestExerciseByMuscle,
  units: ReturnType<typeof useUnits>,
  weightLabel: string
): string {
  if (ex.isDurationSeconds) return formatDurationClock(ex.estimated1RM);
  if (ex.isReps) return `${Math.round(ex.estimated1RM)} reps`;
  return `${formatWeight(ex.estimated1RM, { units })} ${weightLabel} 1RM`;
}

type Row = {
  muscle: StrengthRankMuscle;
  label: string;
  isEmpty: boolean;
  rank: RankSlug;
  rankLabel: string;
  progressToNextPct: number;
  nextRankLabel: string | null;
  topPercentileLabel: string;
  weightSuggestions: WeightIncreaseSuggestion[];
  coreSuggestions: CoreImprovementSuggestion[];
  topExercises: BestExerciseByMuscle[];
  hasStrengthData: boolean;
};

function MuscleRankCard({
  row,
  nextLabel,
  isGoat,
  units,
  weightLabel,
}: {
  row: Row;
  nextLabel: string;
  isGoat: boolean;
  units: ReturnType<typeof useUnits>;
  weightLabel: string;
}) {
  const showProgressBar =
    row.hasStrengthData &&
    !row.isEmpty &&
    row.nextRankLabel != null &&
    !isGoat;

  const pct = Math.min(100, Math.max(0, row.progressToNextPct));

  const exerciseBlock = (() => {
    if (isGoat) {
      return <p className="text-[11px] leading-snug text-zinc-500">All lifts maxed</p>;
    }
    if (row.isEmpty || !row.hasStrengthData) {
      return <p className="text-[11px] leading-snug text-zinc-500">No exercise data yet</p>;
    }
    if (row.muscle === "core") {
      const cs = row.coreSuggestions[0];
      if (cs) {
        return (
          <div className="border-t border-zinc-800/90 pt-1.5">
            <p className="line-clamp-2 min-w-0 break-words text-sm font-medium leading-snug text-zinc-100">
              {cs.name}
            </p>
            <p className="mt-0.5 line-clamp-2 min-w-0 break-words text-sm font-semibold leading-snug text-amber-500">
              {cs.improvementLabel}
            </p>
          </div>
        );
      }
      const ex = row.topExercises[0];
      if (ex) {
        return (
          <div className="border-t border-zinc-800/90 pt-1.5">
            <p className="line-clamp-2 min-w-0 break-words text-sm font-medium leading-snug text-zinc-100">
              {ex.name}
            </p>
            <p className="mt-0.5 line-clamp-2 min-w-0 break-words text-sm font-semibold leading-snug text-amber-500">
              {formatTopExerciseValue(ex, units, weightLabel)}
            </p>
          </div>
        );
      }
      return <p className="text-[11px] leading-snug text-zinc-500">No exercise data yet</p>;
    }
    const w = row.weightSuggestions[0];
    if (w) {
      const target = row.nextRankLabel ?? nextLabel;
      return (
        <div className="border-t border-zinc-800/90 pt-1.5">
          <p className="line-clamp-2 min-w-0 break-words text-sm font-medium leading-snug text-zinc-100">
            {w.exerciseName}
          </p>
          <p className="mt-0.5 line-clamp-2 min-w-0 break-words text-sm font-semibold leading-snug text-amber-500">
            {formatWeight(w.increaseKg, {
              units,
              signed: true,
              omitFractionIfWhole: true,
            })}{" "}
            {weightLabel} to <span className="whitespace-nowrap">{target}</span>
          </p>
        </div>
      );
    }
    const ex = row.topExercises[0];
    if (ex) {
      return (
        <div className="border-t border-zinc-800/90 pt-1.5">
          <p className="line-clamp-2 min-w-0 break-words text-sm font-medium leading-snug text-zinc-100">
            {ex.name}
          </p>
          <p className="mt-0.5 line-clamp-2 min-w-0 break-words text-sm font-semibold leading-snug text-amber-500">
            {formatTopExerciseValue(ex, units, weightLabel)}
          </p>
        </div>
      );
    }
    return <p className="text-[11px] leading-snug text-zinc-500">No exercise data yet</p>;
  })();

  return (
    <li className="card-tap flex min-w-0 flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-900/30 p-2.5">
      {row.isEmpty ? (
        <>
          <p className="text-sm font-semibold leading-snug text-zinc-100">{row.label}</p>
          <p className="text-[11px] leading-snug text-zinc-500">No exercise data yet</p>
        </>
      ) : (
        <>
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5">
            <Image
              src={`/${row.rank || "newbie"}.png`}
              alt={row.rankLabel}
              width={40}
              height={40}
              className="row-span-2 h-10 w-10 shrink-0 self-start object-contain"
              unoptimized
            />
            <p className="line-clamp-2 min-w-0 break-normal text-sm font-semibold leading-snug text-zinc-100">
              {row.label}
            </p>
            <p className="min-w-0 text-[11px] leading-snug text-zinc-400">
              <span className="whitespace-nowrap">{row.rankLabel}</span> • {row.topPercentileLabel}
            </p>
          </div>
          {showProgressBar && (
            <div className="mt-1.5 flex w-full min-w-0 items-center gap-2">
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-amber-500/90 transition-[width]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-zinc-500">{Math.round(pct)}%</span>
            </div>
          )}
          <div className={showProgressBar ? "mt-2 min-w-0" : "mt-1 min-w-0"}>{exerciseBlock}</div>
        </>
      )}
    </li>
  );
}

export function MuscleRankList({ data }: Props) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);

  const { rows, nextLabel, isGoat } = useMemo(() => {
    const nextLabel = data.overallNextRankLabel ?? "";
    const goat = data.overallRankSlug === "goat";
    const suggestionsByMuscle = data.improvementSuggestionsByMuscle ?? {};
    const visible = data.visibleMuscles?.length
      ? data.visibleMuscles
      : (["chest", "back", "legs", "shoulders", "biceps", "triceps"] as StrengthRankMuscle[]);

    const topByMuscle =
      data.topExercisesByMuscle ?? ({} as Record<StrengthRankMuscle, BestExerciseByMuscle[]>);
    const rows: Row[] = visible.map((muscle) => {
      const exerciseCount = data.exerciseCountByMuscle?.[muscle] ?? 0;
      const muscleScore = data.muscleScores?.[muscle] ?? 0;
      const isEmpty =
        (muscle === "core" || muscle === "forearms") &&
        exerciseCount === 0 &&
        muscleScore <= 0;
      const rankInfo = data.muscleRanks[muscle];
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
        rankLabel: rankInfo.rankLabel,
        progressToNextPct: rankInfo.progressToNextPct ?? 0,
        nextRankLabel: rankInfo.nextRankLabel ?? null,
        topPercentileLabel: rankInfo.topPercentileLabel,
        weightSuggestions,
        coreSuggestions,
        topExercises,
        hasStrengthData,
      };
    });

    return { rows, nextLabel, isGoat: goat };
  }, [data]);

  return (
    <div className="card-tap rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Muscle Strength Rankings
      </h2>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
        {rows.map((row) => (
          <MuscleRankCard
            key={row.muscle}
            row={row}
            nextLabel={nextLabel}
            isGoat={isGoat}
            units={units}
            weightLabel={weightLabel}
          />
        ))}
      </ul>
    </div>
  );
}
