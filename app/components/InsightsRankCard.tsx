"use client";

import { useMemo } from "react";
import { RankBadge } from "@/app/components/RankBadge";
import { getRank, getProgressToNextTier } from "@/lib/rankBadges";
import { formatTopPercentDisplay } from "@/lib/formatPercentile";
import type { RankSlug } from "@/lib/rankBadges";

type Props = {
  overallPercentile: number;
};

/** Compact rank card for top of Insights: badge left, text + progress right, ~120px height. */
export function InsightsRankCard({ overallPercentile }: Props) {
  const { rank, tier, rankLabel, nextLabel, progressPct, topLabel } = useMemo(() => {
    const r = getRank(overallPercentile);
    const p = getProgressToNextTier(overallPercentile);
    const topLabel = `${formatTopPercentDisplay(overallPercentile)} of lifters`;
    return {
      rank: r.rank as RankSlug,
      tier: r.tier,
      rankLabel: r.rankLabel,
      nextLabel: p.nextLabel,
      progressPct: p.progressPct,
      topLabel,
    };
  }, [overallPercentile]);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-4 transition hover:border-zinc-700">
      <RankBadge rank={rank} tier={tier} size={120} />
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold tracking-tight text-zinc-100">{rankLabel}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{topLabel}</p>
        <p className="mt-1.5 text-xs text-zinc-500">Next rank: {nextLabel}</p>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
