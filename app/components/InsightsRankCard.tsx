"use client";

import { useMemo, useState } from "react";
import { RankBadge } from "@/app/components/RankBadge";
import { RankLadderPanel } from "@/app/components/RankLadderPanel";
import type { OverallRankDisplaySnapshot } from "@/lib/strengthRanking";
import type { RankSlug } from "@/lib/rankBadges";

type Props = {
  display: OverallRankDisplaySnapshot | null;
};

/** Compact rank card for top of Insights: badge left, text + progress right, ~120px height. */
export function InsightsRankCard({ display }: Props) {
  const [ladderOpen, setLadderOpen] = useState(false);

  const { rank, tier, rankLabel, nextLabel, progressPct, topLabel } = useMemo(() => {
    if (!display) {
      return {
        rank: "newbie" as RankSlug,
        tier: "I" as const,
        rankLabel: "—",
        nextLabel: "",
        progressPct: 0,
        topLabel: "",
      };
    }
    return {
      rank: display.rankSlug as RankSlug,
      tier: display.tier,
      rankLabel: display.rankLabel,
      nextLabel: display.nextRankLabel,
      progressPct: display.progressPct,
      topLabel: `${display.topPercentileLabel} of lifters`,
    };
  }, [display]);

  if (!display) {
    return (
      <div className="card-tap flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <RankBadge rank={rank} tier={tier} size={120} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold tracking-tight text-zinc-100">{rankLabel}</p>
          <p className="mt-0.5 text-xs text-zinc-500">No rank data yet.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card-tap flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center gap-4">
          <RankBadge rank={rank} tier={tier} size={120} />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tracking-tight text-zinc-100">
              <span className="whitespace-nowrap">{rankLabel}</span>
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">{topLabel}</p>
            {nextLabel ? (
              <>
                <p className="mt-1.5 text-xs text-zinc-500">
                  Next rank: <span className="whitespace-nowrap">{nextLabel}</span>
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="mt-1.5 text-xs text-zinc-500">Peak rank</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLadderOpen(true)}
          className="tap-feedback w-full rounded-lg py-2 text-center text-xs font-medium text-amber-400/95 transition hover:bg-zinc-800/80 hover:text-amber-300"
        >
          See all ranks
        </button>
      </div>
      <RankLadderPanel isOpen={ladderOpen} onClose={() => setLadderOpen(false)} display={display} />
    </>
  );
}
