"use client";

import { useMemo } from "react";
import { RankBadge } from "@/app/components/RankBadge";
import { getRank, getProgressToNextTier } from "@/lib/rankBadges";
import type { RankSlug } from "@/lib/rankBadges";

type Props = {
  overallPercentile: number;
};

/** Compact rank card for dashboard 2-column row. Badge centered, rank + tier, Top X%, small progress bar. */
export function DashboardRankWidget({ overallPercentile }: Props) {
  const { rank, tier, rankLabel, topLabel, nextLabel, progressPct } = useMemo(() => {
    const r = getRank(overallPercentile);
    const p = getProgressToNextTier(overallPercentile);
    const topPct = 100 - overallPercentile;
    const top =
      overallPercentile >= 99
        ? "Top 1%"
        : overallPercentile >= 90
          ? "Top 10%"
          : `Top ${topPct}%`;
    return {
      rank: r.rank as RankSlug,
      tier: r.tier,
      rankLabel: r.rankLabel,
      topLabel: top,
      nextLabel: p.nextLabel,
      progressPct: p.progressPct,
    };
  }, [overallPercentile]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700">
      <h2 className="mb-1.5 shrink-0 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        Your Rank
      </h2>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5">
        <RankBadge rank={rank} tier={tier} size={112} />
        <p className="text-center text-base font-bold text-zinc-100">{rankLabel}</p>
        <p className="text-center text-[11px] text-zinc-400">{topLabel} of lifters</p>
        <div className="mt-1.5 w-full">
          <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-0.5 text-center text-[10px] text-zinc-500">Next: {nextLabel}</p>
        </div>
      </div>
    </div>
  );
}
