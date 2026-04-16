"use client";

import { useState } from "react";
import { RANK_COLORS, RANK_LEGEND_ENTRIES, RANK_TOP_PCT_LABELS } from "@/lib/rankBadges";

type Props = {
  className?: string;
};

/**
 * Muscle strength diagram color key: rank names or fixed "Top X%" labels per rank (same dots).
 */
export function MuscleStrengthRankLegend({ className }: Props) {
  const [mode, setMode] = useState<"ranks" | "top">("ranks");

  return (
    <div className={className} aria-label="Rank color key">
      <div className="mb-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span className="text-[10px] text-zinc-500">Key</span>
        <div className="inline-flex rounded-md bg-zinc-800/80 p-0.5">
          <button
            type="button"
            onClick={() => setMode("ranks")}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              mode === "ranks" ? "bg-orange-500 text-black" : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Ranks
          </button>
          <button
            type="button"
            onClick={() => setMode("top")}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              mode === "top" ? "bg-orange-500 text-black" : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Top %
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-zinc-500">
        {RANK_LEGEND_ENTRIES.map(({ rank, label }) => (
          <span key={rank} className="flex items-center gap-1">
            <span
              className="h-2 w-2 shrink-0 rounded"
              style={{ backgroundColor: RANK_COLORS[rank] }}
              aria-hidden
            />
            {mode === "top" ? RANK_TOP_PCT_LABELS[rank] : label}
          </span>
        ))}
      </div>
    </div>
  );
}
