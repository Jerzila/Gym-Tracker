"use client";

import Link from "next/link";
import { useMemo } from "react";
import Body, { type ExtendedBodyPart } from "react-muscle-highlighter";
import { getRankColor } from "@/lib/rankBadges";
import type { RankSlug } from "@/lib/rankBadges";
import type { StrengthRankMuscle } from "@/lib/strengthRanking";
import type { StrengthRankingWithExercises } from "@/app/actions/strengthRanking";
import { useProAccess } from "@/app/components/ProAccessProvider";
import { appHref } from "@/lib/appRoutes";

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
  const { hasPro, requirePro } = useProAccess();
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
  }, [data]);

  const hasData = bodyData.length > 0;

  const card = (
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
        <div className="relative">
          {!hasPro ? (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <div className="pointer-events-auto rounded-xl border border-amber-500/40 bg-zinc-950/70 px-3 py-2.5 text-center shadow-lg backdrop-blur-md sm:px-4 sm:py-3">
                <p className="text-xs font-semibold text-zinc-100 sm:text-sm">Muscle strength detail is Pro</p>
                <p className="mt-1 text-[11px] text-zinc-400 sm:text-xs">
                  Preview the map, then unlock full colors in Insights.
                </p>
                <button
                  type="button"
                  onClick={() => requirePro("muscle_rankings")}
                  className="mt-2.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-zinc-950 transition hover:bg-amber-400 sm:mt-3 sm:text-xs"
                >
                  Unlock Liftly Pro
                </button>
              </div>
            </div>
          ) : null}
          <div
            className={`flex flex-row justify-center gap-2 transition ${
              hasPro ? "" : "pointer-events-none select-none blur-md saturate-50 opacity-80"
            }`}
          >
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
        </div>
      )}
      <p
        className={`mt-2 text-center text-xs transition ${
          !hasPro && hasData ? "text-zinc-500" : "text-amber-500 group-hover:text-amber-400"
        }`}
      >
        {!hasPro && hasData
          ? "Unlock Pro for full muscle strength in Insights."
          : "Tap to view muscle strength rankings."}
      </p>
    </div>
  );

  if (!hasPro && hasData) {
    return <div className="block">{card}</div>;
  }

  return (
    <Link href={`${appHref("/insights")}#muscle-strength`} prefetch={true} className="block group">
      {card}
    </Link>
  );
}
