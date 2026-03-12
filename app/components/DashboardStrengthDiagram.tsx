"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Body, { type ExtendedBodyPart } from "react-muscle-highlighter";
import { RankBadge } from "@/app/components/RankBadge";
import { getRank, getProgressToNextTier, getRankColor, RANK_COLORS } from "@/lib/rankBadges";
import type { RankSlug } from "@/lib/rankBadges";
import type { StrengthRankMuscle } from "@/lib/strengthRanking";
import type { StrengthRankingWithExercises } from "@/app/actions/strengthRanking";
import { formatWeight } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";

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

/** Body slug → strength rank muscle (for tap card). */
const SLUG_TO_STRENGTH_MUSCLE: Record<string, StrengthRankMuscle> = {
  chest: "chest",
  "upper-back": "back",
  "lower-back": "back",
  deltoids: "shoulders",
  biceps: "arms",
  triceps: "arms",
  quadriceps: "legs",
  hamstring: "legs",
  gluteal: "legs",
  calves: "legs",
};

const STRENGTH_MUSCLE_LABEL: Record<StrengthRankMuscle, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  arms: "Arms",
};

/** Legend order and labels for rank colors. */
const RANK_LEGEND_ENTRIES: { rank: RankSlug; label: string }[] = [
  { rank: "newbie", label: "Newbie" },
  { rank: "starter", label: "Starter" },
  { rank: "apprentice", label: "Apprentice" },
  { rank: "lifter", label: "Lifter" },
  { rank: "semi-pro", label: "Semi-Pro" },
  { rank: "pro", label: "Pro" },
  { rank: "elite", label: "Elite" },
  { rank: "master", label: "Master" },
  { rank: "grandmaster", label: "Grandmaster" },
  { rank: "titan", label: "Titan" },
  { rank: "goat", label: "GOAT" },
];

type Props = {
  data: StrengthRankingWithExercises;
  gender?: "male" | "female" | null;
};

export function DashboardStrengthDiagram({ data, gender = "male" }: Props) {
  const units = useUnits();
  const isMobile = useIsMobile();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [view, setView] = useState<"front" | "back">("front");

  const { bodyData, strengthMuscleBySlug } = useMemo(() => {
    const musclePercentiles = data.musclePercentiles;
    const slugToMuscle = { ...SLUG_TO_STRENGTH_MUSCLE };
    const bodyData: ExtendedBodyPart[] = [];
    for (const [slug, muscle] of Object.entries(slugToMuscle)) {
      const pct = musclePercentiles[muscle];
      const rank = getRank(pct).rank;
      // Newbie (no data) uses lowest rank color (gray) so diagram shows full neutral body
      const fill = getRankColor(rank as RankSlug);
      bodyData.push({
        slug: slug as ExtendedBodyPart["slug"],
        color: fill,
      });
    }
    return { bodyData, strengthMuscleBySlug: slugToMuscle };
  }, [data.musclePercentiles]);

  const handleBodyPartPress = useCallback((part: ExtendedBodyPart) => {
    setSelectedSlug(part.slug ?? null);
  }, []);

  const selectedMuscle = selectedSlug != null ? strengthMuscleBySlug[selectedSlug] : null;
  const muscleCard = useMemo(() => {
    if (!selectedMuscle) return null;
    const pct = data.musclePercentiles[selectedMuscle];
    const rankInfo = data.muscleRanks[selectedMuscle];
    const r = getRank(pct);
    const progress = getProgressToNextTier(pct);
    const bestEx = data.bestExerciseByMuscle[selectedMuscle];
    const topPct = 100 - pct;
    const topLabel = pct >= 99 ? "Top 1%" : pct >= 90 ? "Top 10%" : `Top ${topPct}%`;
    return {
      muscle: selectedMuscle,
      label: STRENGTH_MUSCLE_LABEL[selectedMuscle],
      rank: r.rank as RankSlug,
      tier: r.tier,
      rankLabel: rankInfo.rankLabel,
      topLabel,
      bestExercise: bestEx,
      nextLabel: progress.nextLabel,
      progressPct: progress.progressPct,
    };
  }, [selectedMuscle, data]);

  if (bodyData.length === 0) {
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
          <div className="mt-2 flex justify-center">
            <RankBadge rank={muscleCard.rank} tier={muscleCard.tier} size={isMobile ? 40 : 52} />
          </div>
          <p className="mt-1.5 text-center text-sm font-medium text-zinc-300">
            {muscleCard.rankLabel}
          </p>
          <p className={`text-center text-zinc-400 ${isMobile ? "text-sm" : "text-xs"}`}>{muscleCard.topLabel}</p>
          {muscleCard.bestExercise ? (
            <p className={`mt-2 border-t border-zinc-700 pt-2 text-zinc-400 ${isMobile ? "text-sm" : "text-xs"}`}>
              <span className="font-medium text-zinc-300">Top exercise</span>
              <br />
              {muscleCard.bestExercise.name} —{" "}
              {formatWeight(muscleCard.bestExercise.estimated1RM, { units })} 1RM
            </p>
          ) : (
            <p className={`mt-2 border-t border-zinc-700 pt-2 text-zinc-500 ${isMobile ? "text-sm" : "text-xs"}`}>
              No strength data yet
              <br />
              <span className={isMobile ? "text-xs" : "text-[10px]"}>Log {muscleCard.label.toLowerCase()} exercises to start ranking.</span>
            </p>
          )}
          <div className="mt-2">
            <p className={`text-zinc-500 ${isMobile ? "text-xs" : "text-[10px]"}`}>Next: {muscleCard.nextLabel}</p>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-200"
                style={{ width: `${muscleCard.progressPct}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[140px] flex-col items-center justify-center py-4 text-center">
          <p className={isMobile ? "text-sm text-zinc-500" : "text-xs text-zinc-500"}>Tap a muscle to view strength rank</p>
        </div>
      )}
    </div>
  );

  const bodyProps = {
    data: bodyData,
    gender: (gender === "female" ? "female" : "male") as "male" | "female",
    scale: 1.28,
    defaultFill: DEFAULT_FILL,
    border: "none" as const,
    onBodyPartPress: handleBodyPartPress,
  };

  return (
    <div className="dashboard-strength-diagram relative mt-0 pt-0">
      <style>{`
        .dashboard-strength-diagram path:hover { filter: brightness(1.15); }
        ${selectedSlugSafe ? `.dashboard-strength-diagram path[id="${selectedSlugSafe}"] { filter: brightness(1.15); }` : ""}
        @keyframes muscle-panel-fade { from { opacity: 0; } to { opacity: 1; } }
        .muscle-panel-content { animation: muscle-panel-fade 0.2s ease-out; }
      `}</style>

      {/* Mobile: toggle + body and widget side-by-side (max-width 768px) */}
      {isMobile && (
        <div className="flex flex-col gap-2">
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
              <Body {...bodyProps} side={view} />
            </div>
            {infoCard}
          </div>
        </div>
      )}

      {/* Desktop: bodies left, panel right (unchanged) */}
      {!isMobile && (
        <div className="grid grid-cols-[2.2fr_1fr] items-center gap-3 md:gap-4">
          <div className="flex min-w-0 w-full flex-row justify-center gap-2 overflow-visible md:gap-3">
            <Body {...bodyProps} side="front" />
            <Body {...bodyProps} side="back" />
          </div>
          {infoCard}
        </div>
      )}
      {/* Section 7: Rank color legend — compact */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <span
            className="h-2 w-2 shrink-0 rounded"
            style={{ backgroundColor: RANK_COLORS.newbie }}
            aria-hidden
          />
          Newbie
        </span>
        {RANK_LEGEND_ENTRIES.map(({ rank, label }) => (
          <span key={rank} className="flex items-center gap-1">
            <span
              className="h-2 w-2 shrink-0 rounded"
              style={{ backgroundColor: RANK_COLORS[rank] }}
              aria-hidden
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
