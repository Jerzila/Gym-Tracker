"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { RANK_LADDER } from "@/lib/rankBadges";
import type { OverallRankDisplaySnapshot } from "@/lib/strengthRanking";
import type { RankSlug } from "@/lib/rankBadges";
import { useLockBodyScroll } from "@/app/lib/useLockBodyScroll";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  display: OverallRankDisplaySnapshot;
};

/** Bottom-sheet style panel showing full rank ladder and user position. */
export function RankLadderPanel({ isOpen, onClose, display }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  useLockBodyScroll(isOpen);

  const rankLabel = display.rankLabel;
  const rank = display.rankSlug as RankSlug;
  const topPercentileLabel = display.topPercentileLabel;
  const nextRankLabel = display.nextRankLabel;
  const nextTopPercentileLabel = display.nextTopPercentileLabel;
  const progressPct = display.progressPct;

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY == null) return;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (dy > 60) onClose();
      setTouchStartY(null);
    },
    [onClose, touchStartY]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center sm:bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rank-ladder-title"
    >
      <div
        className="absolute inset-0 bg-black/50 sm:bg-transparent"
        onClick={handleOverlayClick}
        aria-hidden
      />
      <div
        ref={panelRef}
        className="relative w-full max-h-[85vh] overflow-hidden rounded-t-2xl border border-zinc-800 border-b-0 bg-zinc-900 shadow-xl sm:max-w-md sm:rounded-2xl sm:border-b sm:max-h-[80vh]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <h2 id="rank-ladder-title" className="text-lg font-semibold text-zinc-100">
            Strength Rank Ladder
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="tap-feedback -mr-1 rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex justify-center py-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-zinc-600" aria-hidden />
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 pb-8" style={{ maxHeight: "calc(85vh - 56px)" }}>
          <ul className="space-y-1 py-2">
            {RANK_LADDER.map((r) => {
              const isCurrent = r.rank === rank;
              return (
                <li key={r.rank}>
                  <div
                    className={`flex items-center gap-4 rounded-lg px-3 py-3 ${
                      isCurrent ? "bg-amber-500/10 ring-1 ring-amber-500/30" : ""
                    }`}
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-zinc-800">
                      <Image
                        src={`/${r.rank}.png`}
                        alt=""
                        width={56}
                        height={56}
                        className="h-full w-full object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-medium ${isCurrent ? "text-amber-400" : "text-zinc-200"}`}
                      >
                        {isCurrent ? rankLabel : r.displayName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {isCurrent ? `${topPercentileLabel} of lifters` : `${r.topPctLabel} of lifters`}
                      </p>
                    </div>
                  </div>
                  {isCurrent && nextRankLabel && nextTopPercentileLabel && (
                    <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2.5">
                      <p className="text-xs font-medium text-zinc-400">
                        Next rank: {nextRankLabel} ({nextTopPercentileLabel} of lifters)
                      </p>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-700">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>,
    document.body
  );
}
