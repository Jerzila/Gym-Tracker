"use client";

import { useMemo, useState } from "react";
import { RankBadge } from "@/app/components/RankBadge";
import { RankLadderPanel } from "@/app/components/RankLadderPanel";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";
import { overallRankDisplayFromOutput, type StrengthRankMuscle } from "@/lib/strengthRanking";
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

const PRIMARY_MUSCLES: StrengthRankMuscle[] = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "biceps",
  "triceps",
];

type Props = {
  data: StrengthRankingWithExercises;
};

/**
 * Progression guide: next rank badge, progress %, and multiple improvement paths
 * per limiting muscle (e.g. Bench +3kg, Incline +2kg).
 */
export function RankImprovementCard({ data }: Props) {
  const units = useUnits();
  const [ladderOpen, setLadderOpen] = useState(false);

  const content = useMemo(() => {
    const nextLabel = data.overallNextRankLabel ?? "";
    const nextRank = (data.overallNextRankSlug ?? data.overallRankSlug) as
      | "newbie"
      | "starter"
      | "apprentice"
      | "lifter"
      | "semi-pro"
      | "pro"
      | "elite"
      | "master"
      | "grandmaster"
      | "titan"
      | "goat";
    const nextTier = (data.overallNextRankTier ?? data.overallTier) as "I" | "II" | "III";
    const suggestionsByMuscle = data.improvementSuggestionsByMuscle ?? {};
    const limiting = PRIMARY_MUSCLES.filter(
      (m) => (suggestionsByMuscle[m]?.length ?? 0) > 0
    )
      .map((m) => ({
        muscle: m,
        label: MUSCLE_LABELS[m],
        suggestions: (suggestionsByMuscle[m] ?? []).slice(0, 1),
      }))
      .sort(
        (a, b) =>
          (data.muscleScores?.[a.muscle] ?? 0) - (data.muscleScores?.[b.muscle] ?? 0)
      )
      .slice(0, 3);

    return {
      nextLabel,
      nextRank,
      nextTier,
      progressPct: data.overallProgressToNextPct ?? 0,
      limiting,
    };
  }, [data]);

  const weightLabel = weightUnitLabel(units);

  return (
    <div className="card-tap flex h-full flex-col justify-between">
      <div className="space-y-1.5">
        {content.nextLabel ? (
          <>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 text-xs font-semibold text-zinc-200">
                Next rank:{" "}
                <span className="whitespace-nowrap">{content.nextLabel}</span>
              </p>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                <RankBadge
                  rank={content.nextRank}
                  tier={content.nextTier}
                  size={24}
                  className="h-full w-full [&_img]:max-h-full [&_img]:max-w-full"
                />
              </div>
            </div>

            {content.progressPct < 100 && (
              <div className="space-y-0.5">
                <div
                  className="h-1 w-full overflow-hidden rounded-full bg-zinc-800"
                  role="progressbar"
                  aria-valuenow={Math.round(content.progressPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progress to ${content.nextLabel}`}
                >
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, content.progressPct))}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-500">
                  {Math.round(content.progressPct)}% to{" "}
                  <span className="whitespace-nowrap">{content.nextLabel}</span>
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs font-semibold text-zinc-200">Peak overall rank</p>
        )}
        {content.limiting.length === 0 ? (
          <p className="text-xs text-emerald-400/90">
            All muscle groups at or above next rank.
          </p>
        ) : (
          <>
            <p className="text-[10px] text-zinc-500">
              Add weight on these to reach{" "}
              <span className="whitespace-nowrap">{content.nextLabel}</span>:
            </p>
            <ul className="space-y-1">
              {content.limiting.map(({ muscle, label, suggestions }) => (
              <li key={muscle} className="flex items-baseline justify-between gap-2">
                <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {label}
                </p>
                {suggestions.map((s) => (
                  <span
                    key={s.exerciseId}
                    className="flex min-w-0 flex-1 items-baseline justify-end gap-2 text-right text-[11px] text-zinc-400"
                  >
                    <span className="min-w-0 truncate text-right">{s.exerciseName}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-amber-400">
                      {formatWeight(s.increaseKg, {
                        units,
                        signed: true,
                        omitFractionIfWhole: true,
                      })}{" "}
                      {weightLabel}
                    </span>
                  </span>
                ))}
              </li>
            ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-1.5 flex justify-end">
        <button
          type="button"
          onClick={() => setLadderOpen(true)}
          className="tap-feedback inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-500 underline decoration-amber-500/50 underline-offset-1 hover:text-amber-400 hover:decoration-amber-400"
        >
          See All Ranks
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>

      <RankLadderPanel
        isOpen={ladderOpen}
        onClose={() => setLadderOpen(false)}
        display={overallRankDisplayFromOutput(data)}
      />
    </div>
  );
}
