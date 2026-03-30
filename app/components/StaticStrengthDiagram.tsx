"use client";

import { useMemo } from "react";
import Body, { type ExtendedBodyPart } from "react-muscle-highlighter";
import { getRankColor } from "@/lib/rankBadges";
import type { RankSlug } from "@/lib/rankBadges";
import type { StrengthRankingWithExercises } from "@/app/actions/strengthRanking";
import type { StrengthRankMuscle } from "@/lib/strengthRanking";

/** Fallback for body parts not in our strength map; Newbie rank uses getRankColor("newbie") (gray). */
const DEFAULT_FILL = "#2a2a2a";

/**
 * Body slug → strength rank muscle (matches DashboardStrengthDiagram mapping).
 * Core: rectus_abdominis/upper_abs/lower_abs → "core"; obliques_left/obliques_right → "core" (library slugs).
 * Forearms: forearm_left/forearm_right → "forearms" (one slug, both sides).
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
  abs: "core",
  obliques: "core",
  forearm: "forearms",
};

/** Core muscle regions — front diagram only. */
const CORE_DIAGRAM_SLUGS = ["abs", "obliques"] as const;

function slugsForMuscles(muscles: StrengthRankMuscle[]): string[] {
  const set = new Set(muscles);
  return Object.entries(SLUG_TO_STRENGTH_MUSCLE)
    .filter(([, m]) => set.has(m))
    .map(([slug]) => slug);
}

export function StaticStrengthDiagram({
  data,
  gender = "male",
  side,
  scale = 1.1,
  highlightMuscles,
}: {
  data: Pick<StrengthRankingWithExercises, "muscleRanks" | "exerciseCountByMuscle">;
  gender?: "male" | "female" | null;
  side: "front" | "back";
  scale?: number;
  highlightMuscles?: StrengthRankMuscle[];
}) {
  const highlightSlugs = useMemo(() => {
    const mus = highlightMuscles ?? [];
    if (mus.length === 0) return [];
    const slugs = slugsForMuscles(mus);
    if (side === "back") {
      return slugs.filter((s) => !CORE_DIAGRAM_SLUGS.includes(s as (typeof CORE_DIAGRAM_SLUGS)[number]));
    }
    return slugs;
  }, [highlightMuscles, side]);

  const bodyData = useMemo(() => {
    const allParts: ExtendedBodyPart[] = [];
    for (const [slug, muscle] of Object.entries(SLUG_TO_STRENGTH_MUSCLE)) {
      const exerciseCount = data.exerciseCountByMuscle?.[muscle] ?? 0;
      const isEmpty = (muscle === "core" || muscle === "forearms") && exerciseCount === 0;
      if (isEmpty) continue;
      const rankSlug = data.muscleRanks[muscle].rankSlug as RankSlug;
      const fill = getRankColor(rankSlug);
      allParts.push({
        slug: slug as ExtendedBodyPart["slug"],
        color: fill,
      });
    }
    if (side === "back") {
      return allParts.filter(
        (p) => p.slug && !CORE_DIAGRAM_SLUGS.includes(p.slug as (typeof CORE_DIAGRAM_SLUGS)[number])
      );
    }
    return allParts;
  }, [data.exerciseCountByMuscle, data.muscleRanks, side]);

  const highlightCss = useMemo(() => {
    if (highlightSlugs.length === 0) return "";
    const selectors = highlightSlugs
      .map((s) => `path[id="${CSS.escape(s)}"]`)
      .join(", ");
    return `
      .static-strength-diagram--highlight ${selectors} {
        filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.35)) drop-shadow(0 0 14px rgba(16, 185, 129, 0.18));
      }
    `;
  }, [highlightSlugs]);

  return (
    <div className={`static-strength-diagram ${highlightCss ? "static-strength-diagram--highlight" : ""} flex items-center justify-center`}>
      {highlightCss ? <style>{highlightCss}</style> : null}
      <Body
        gender={(gender === "female" ? "female" : "male") as "male" | "female"}
        scale={scale}
        defaultFill={DEFAULT_FILL}
        border="none"
        data={bodyData}
        side={side}
      />
    </div>
  );
}

