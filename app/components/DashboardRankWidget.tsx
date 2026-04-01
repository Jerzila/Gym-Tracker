"use client";

import { RankBadge } from "@/app/components/RankBadge";
import type { OverallRankDisplaySnapshot } from "@/lib/strengthRanking";

type Props = {
  display: OverallRankDisplaySnapshot | null;
};

/** Compact rank card for dashboard 2-column row. Badge centered, rank + tier, Top X%, small progress bar. */
export function DashboardRankWidget({ display }: Props) {
  if (!display) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700">
        <h2 className="mb-1.5 shrink-0 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Overall Rank
        </h2>
        <p className="flex flex-1 items-center justify-center text-sm text-zinc-500 text-center px-2">
          Log more lifts to calculate your overall strength rank.
        </p>
      </div>
    );
  }

  const { rankSlug, tier, rankLabel, topPercentileLabel, nextRankLabel, progressPct } = display;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700">
      <h2 className="mb-1.5 shrink-0 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        Overall Rank
      </h2>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5">
        <RankBadge rank={rankSlug} tier={tier} size={112} />
        <p className="text-center text-base font-bold text-zinc-100">{rankLabel}</p>
        <p className="text-center text-[11px] text-zinc-400">{`${topPercentileLabel} of lifters`}</p>
        <div className="mt-1.5 w-full">
          {nextRankLabel ? (
            <>
              <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-0.5 text-center text-[10px] text-zinc-500">Next: {nextRankLabel}</p>
            </>
          ) : (
            <p className="text-center text-[10px] text-zinc-500">Peak rank</p>
          )}
        </div>
      </div>
    </div>
  );
}
