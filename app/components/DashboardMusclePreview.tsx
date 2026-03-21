"use client";

import Link from "next/link";
import { useMemo } from "react";
import Body, { type ExtendedBodyPart } from "react-muscle-highlighter";
import { getRankColor } from "@/lib/rankBadges";
import type { RankSlug } from "@/lib/rankBadges";
import type { StrengthRankMuscle } from "@/lib/strengthRanking";
import type { StrengthRankingWithExercises } from "@/app/actions/strengthRanking";

/** Fallback for body parts not in map; Newbie uses getRankColor("newbie") (gray). */
const DEFAULT_FILL = "#2a2a2a";

/** Body slug → strength rank muscle. Same as DashboardStrengthDiagram. */
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
};

type Props = {
  data: StrengthRankingWithExercises | null;
  gender?: "male" | "female" | null;
};

export function DashboardMusclePreview({ data, gender = "male" }: Props) {
  const bodyData = useMemo(() => {
    if (!data?.muscleRanks) return [];
    const out: ExtendedBodyPart[] = [];
    for (const [slug, muscle] of Object.entries(SLUG_TO_STRENGTH_MUSCLE)) {
      const rankSlug = data.muscleRanks[muscle].rankSlug as RankSlug;
      const fill = getRankColor(rankSlug);
      out.push({
        slug: slug as ExtendedBodyPart["slug"],
        color: fill,
      });
    }
    return out;
  }, [data?.muscleRanks]);

  const hasData = bodyData.length > 0;

  return (
    <Link href="/insights#muscle-strength" prefetch={true} className="block group">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700 hover:bg-zinc-900/70">
        <h2 className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Muscle Strength
        </h2>
        <p className="mb-2 text-[11px] text-zinc-500">Based on your strength rankings</p>
        {!hasData ? (
          <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/30 py-4">
            <p className="text-center text-xs text-zinc-500">
              No strength data yet. Log exercises to see rankings.
            </p>
          </div>
        ) : (
          <div className="flex flex-row justify-center gap-2">
            <Body
              data={bodyData}
              side="front"
              gender={gender === "female" ? "female" : "male"}
              scale={0.7}
              defaultFill={DEFAULT_FILL}
              border="none"
            />
            <Body
              data={bodyData}
              side="back"
              gender={gender === "female" ? "female" : "male"}
              scale={0.7}
              defaultFill={DEFAULT_FILL}
              border="none"
            />
          </div>
        )}
        <p className="mt-2 text-center text-xs text-amber-500 transition group-hover:text-amber-400">
          Tap to view muscle strength rankings.
        </p>
      </div>
    </Link>
  );
}
