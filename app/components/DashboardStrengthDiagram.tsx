"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Body, { type ExtendedBodyPart } from "react-muscle-highlighter";
import { RankBadge } from "@/app/components/RankBadge";
import { getRankColor, RANK_COLORS } from "@/lib/rankBadges";
import { MuscleStrengthRankLegend } from "@/app/components/MuscleStrengthRankLegend";
import type { RankSlug } from "@/lib/rankBadges";
import type { StrengthRankMuscle } from "@/lib/strengthRanking";
import type { StrengthRankingWithExercises } from "@/app/actions/strengthRanking";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { formatDurationClock } from "@/lib/formatDuration";
import { useUnits } from "@/app/components/UnitsContext";
import type { BestExerciseByMuscle } from "@/app/actions/strengthRanking";
import { useProAccess } from "@/app/components/ProAccessProvider";

const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

/** Fallback for body parts not in our strength map; Newbie rank uses getRankColor("newbie") (gray). */
const DEFAULT_FILL = "#2a2a2a";

/**
 * Body slug → strength rank muscle (for tap card).
 * Core: rectus_abdominis/upper_abs/lower_abs → "abs"; obliques_left/obliques_right → "obliques" (library slugs).
 * Forearms: forearm_left/forearm_right → "forearm" (one slug, both sides).
 */
const SLUG_TO_STRENGTH_MUSCLE: Record<string, StrengthRankMuscle> = {
  chest: "chest",
  "upper-back": "back",
  "lower-back": "back",
  deltoids: "shoulders",
  biceps: "biceps",
  triceps: "triceps",
  quadriceps: "legs",
  hamstring: "legs",
  gluteal: "legs",
  calves: "legs",
  // Core (front only): abs = rectus/upper/lower abs; obliques = side abs
  abs: "core",
  obliques: "core",
  // Forearms (front and back)
  forearm: "forearms",
};

/** Core muscle regions — front diagram only. */
const CORE_DIAGRAM_SLUGS = ["abs", "obliques"] as const;

const STRENGTH_MUSCLE_LABEL: Record<StrengthRankMuscle, string> = {
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
  gender?: "male" | "female" | null;
};

function formatDiagramBestExercise(
  ex: BestExerciseByMuscle,
  units: ReturnType<typeof useUnits>,
  weightLabel: string
): string {
  if (ex.isDurationSeconds) return formatDurationClock(ex.estimated1RM);
  if (ex.isReps) return `${Math.round(ex.estimated1RM)} reps`;
  return `${formatWeight(ex.estimated1RM, { units })} ${weightLabel} 1RM`;
}

export function DashboardStrengthDiagram({ data, gender = "male" }: Props) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  const isMobile = useIsMobile();
  const { hasPro, requirePro } = useProAccess();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [view, setView] = useState<"front" | "back">("front");

  const { bodyDataFront, bodyDataBack, strengthMuscleBySlug } = useMemo(() => {
    const slugToMuscle = { ...SLUG_TO_STRENGTH_MUSCLE };
    const allParts: ExtendedBodyPart[] = [];
    for (const [slug, muscle] of Object.entries(slugToMuscle)) {
      const exerciseCount = data.exerciseCountByMuscle?.[muscle] ?? 0;
      const muscleScore = data.muscleScores?.[muscle] ?? 0;
      const isEmpty =
        (muscle === "core" || muscle === "forearms") &&
        exerciseCount === 0 &&
        muscleScore <= 0;
      // For core/forearms with no exercises, do not apply a rank color; use default fill.
      if (isEmpty) continue;
      const rankSlug = data.muscleRanks[muscle].rankSlug as RankSlug;
      const fill = getRankColor(rankSlug);
      allParts.push({
        slug: slug as ExtendedBodyPart["slug"],
        color: fill,
      });
    }
    // Core regions (abs, obliques) only on front view; back view excludes them
    const bodyDataFront = allParts;
    const bodyDataBack = allParts.filter(
      (p) => p.slug && !CORE_DIAGRAM_SLUGS.includes(p.slug as (typeof CORE_DIAGRAM_SLUGS)[number])
    );
    return { bodyDataFront, bodyDataBack, strengthMuscleBySlug: slugToMuscle };
  }, [data.muscleRanks, data.exerciseCountByMuscle]);

  const handleBodyPartPress = useCallback((part: ExtendedBodyPart) => {
    setSelectedSlug(part.slug ?? null);
  }, []);

  const selectedMuscle = selectedSlug != null ? strengthMuscleBySlug[selectedSlug] : null;
  const muscleCard = useMemo(() => {
    if (!selectedMuscle) return null;
    const exerciseCount = data.exerciseCountByMuscle?.[selectedMuscle] ?? 0;
    const muscleScore = data.muscleScores?.[selectedMuscle] ?? 0;
    const isEmpty =
      (selectedMuscle === "core" || selectedMuscle === "forearms") &&
      exerciseCount === 0 &&
      muscleScore <= 0;
    const rankInfo = data.muscleRanks[selectedMuscle];
    const bestEx = data.bestExerciseByMuscle[selectedMuscle];
    const topLabel = `${rankInfo.topPercentileLabel} of lifters`;
    return {
      muscle: selectedMuscle,
      label: STRENGTH_MUSCLE_LABEL[selectedMuscle],
      isEmpty,
      rank: rankInfo.rankSlug as RankSlug,
      tier: rankInfo.tier,
      rankLabel: rankInfo.rankLabel,
      topLabel,
      bestExercise: bestEx,
      nextLabel: rankInfo.nextRankLabel ?? "Peak rank",
      progressPct: rankInfo.progressToNextPct,
    };
  }, [selectedMuscle, data]);

  if (bodyDataFront.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No strength data per muscle yet. Log more exercises.</p>
    );
  }

  const selectedSlugSafe = selectedSlug ? CSS.escape(selectedSlug) : "";

  const infoCard = (
    <div
      className={`min-w-0 rounded-lg border border-zinc-700 bg-zinc-900/95 p-3 shadow-lg backdrop-blur-sm ${
        isMobile ? "w-[40%] max-w-[180px] text-sm" : "max-w-[260px]"
      }`}
    >
      {muscleCard ? (
        <div key={muscleCard.muscle} className="muscle-panel-content">
          <p className="font-semibold text-zinc-100">{muscleCard.label}</p>
          {muscleCard.isEmpty ? (
            <p className="mt-2 text-sm text-zinc-500">
              No strength data yet
              <br />
              <span className="text-xs">
                Log exercises in this muscle group to see your rank.
              </span>
            </p>
          ) : (
            <>
              <div className="mt-2 flex justify-center [&_img]:object-contain" style={{ marginBottom: 8 }}>
                <RankBadge rank={muscleCard.rank} tier={muscleCard.tier} size={isMobile ? 56 : 72} />
              </div>
              <p className="text-center text-sm font-medium text-zinc-300">
                <span className="whitespace-nowrap">{muscleCard.rankLabel}</span>
              </p>
              <p className={`text-center text-zinc-400 ${isMobile ? "text-sm" : "text-xs"}`}>{muscleCard.topLabel}</p>
            </>
          )}
          {!muscleCard.isEmpty && (
            muscleCard.bestExercise ? (
              <p className={`mt-2 border-t border-zinc-700 pt-2 text-zinc-400 ${isMobile ? "text-sm" : "text-xs"}`}>
                <span className="font-medium text-zinc-300">Top exercise</span>
                <br />
                {`${muscleCard.bestExercise.name} — ${formatDiagramBestExercise(
                  muscleCard.bestExercise,
                  units,
                  weightLabel
                )}`}
              </p>
            ) : (
              <p className={`mt-2 border-t border-zinc-700 pt-2 text-zinc-500 ${isMobile ? "text-sm" : "text-xs"}`}>
                No strength data yet
                <br />
                <span className={isMobile ? "text-xs" : "text-[10px]"}>
                  Log {muscleCard.label.toLowerCase()} exercises to start ranking.
                </span>
              </p>
            )
          )}
          {!muscleCard.isEmpty && (
            <div className="mt-2">
              <p className={`text-zinc-500 ${isMobile ? "text-xs" : "text-[10px]"}`}>
                Next: <span className="whitespace-nowrap">{muscleCard.nextLabel}</span>
              </p>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-200"
                  style={{ width: `${muscleCard.progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-[140px] flex-col items-center justify-center py-4 text-center">
          <p className={isMobile ? "text-sm text-zinc-500" : "text-xs text-zinc-500"}>Tap a muscle to view strength rank</p>
        </div>
      )}
    </div>
  );

  const bodyPropsBase = {
    gender: (gender === "female" ? "female" : "male") as "male" | "female",
    scale: 1.28,
    defaultFill: DEFAULT_FILL,
    border: "none" as const,
    onBodyPartPress: hasPro ? handleBodyPartPress : undefined,
  };

  return (
    <div className="dashboard-strength-diagram relative mt-0 pt-0">
      <style>{`
        .dashboard-strength-diagram path:hover { filter: brightness(1.15); }
        ${selectedSlugSafe ? `.dashboard-strength-diagram path[id="${selectedSlugSafe}"] { filter: brightness(1.15); }` : ""}
        @keyframes muscle-panel-fade { from { opacity: 0; } to { opacity: 1; } }
        .muscle-panel-content { animation: muscle-panel-fade 0.2s ease-out; }
      `}</style>

      {!hasPro ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-xl border border-amber-500/40 bg-zinc-950/70 px-4 py-3 text-center shadow-lg backdrop-blur-md">
            <p className="text-sm font-semibold text-zinc-100">Detailed muscle strength is Pro</p>
            <p className="mt-1 text-xs text-zinc-400">Preview the feature, then unlock full colors and per-muscle details.</p>
            <button
              type="button"
              onClick={() => requirePro("muscle_rankings")}
              className="mt-3 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400"
            >
              Unlock Liftly Pro
            </button>
          </div>
        </div>
      ) : null}

      {/* Mobile: toggle + body and widget side-by-side (max-width 768px) */}
      {isMobile && (
        <div className={`flex flex-col gap-2 transition ${hasPro ? "" : "pointer-events-none select-none blur-md saturate-50 opacity-80"}`}>
          <div className="flex rounded-lg bg-zinc-900 p-1">
            <button
              type="button"
              onClick={() => setView("front")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                view === "front" ? "bg-orange-500 text-black" : "text-zinc-400"
              }`}
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => setView("back")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                view === "back" ? "bg-orange-500 text-black" : "text-zinc-400"
              }`}
            >
              Back
            </button>
          </div>
          <div className="flex flex-row items-center justify-center gap-4">
            <div className="flex w-[60%] max-w-[260px] flex-shrink-0 items-center justify-center">
              <Body
                {...bodyPropsBase}
                data={view === "front" ? bodyDataFront : bodyDataBack}
                side={view}
              />
            </div>
            {infoCard}
          </div>
        </div>
      )}

      {/* Desktop: bodies left, panel right (unchanged) */}
      {!isMobile && (
        <div
          className={`grid grid-cols-[2.2fr_1fr] items-center gap-3 md:gap-4 transition ${
            hasPro ? "" : "pointer-events-none select-none blur-md saturate-50 opacity-80"
          }`}
        >
          <div className="flex min-w-0 w-full flex-row justify-center gap-2 overflow-visible md:gap-3">
            <Body {...bodyPropsBase} data={bodyDataFront} side="front" />
            <Body {...bodyPropsBase} data={bodyDataBack} side="back" />
          </div>
          {infoCard}
        </div>
      )}
      {/* Section 7: Rank color legend — compact */}
      <MuscleStrengthRankLegend className="mt-1" />
    </div>
  );
}
