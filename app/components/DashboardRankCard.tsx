"use client";

import { useMemo } from "react";
import { RankBadge } from "@/app/components/RankBadge";
import { getRank, getProgressToNextTier } from "@/lib/rankBadges";
import type { RankSlug } from "@/lib/rankBadges";

type Props = {
  overallPercentile: number;
};

export function DashboardRankCard({ overallPercentile }: Props) {
  const { rank, tier, rankLabel, nextLabel, progressPct } = useMemo(() => {
    const r = getRank(overallPercentile);
    const p = getProgressToNextTier(overallPercentile);
    return {
      rank: r.rank as RankSlug,
      tier: r.tier,
      rankLabel: r.rankLabel,
      nextLabel: p.nextLabel,
      progressPct: p.progressPct,
    };
  }, [overallPercentile]);

  const topPct = 100 - overallPercentile;
  const topLabel =
    overallPercentile >= 99
      ? "Top 1% of lifters"
      : overallPercentile >= 90
        ? "Top 10% of lifters"
        : `Top ${topPct}% of lifters`;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Your Rank
      </h2>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6">
        <RankBadge rank={rank} tier={tier} size={88} />
        <div className="flex flex-1 flex-col items-center text-center sm:items-start sm:text-left">
          <p className="text-xl font-bold text-zinc-100">{rankLabel}</p>
          <p className="mt-0.5 text-sm text-zinc-400">{topLabel} of lifters</p>
          <div className="mt-4 w-full max-w-xs">
            <div className="mb-1 flex justify-between text-xs text-zinc-500">
              <span>Progress</span>
              <span>Next: {nextLabel}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
