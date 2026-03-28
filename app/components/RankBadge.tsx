"use client";

import Image from "next/image";
import { RANK_SLUGS, type RankSlug } from "@/lib/rankBadges";
import { GoatIcon } from "@/components/icons";

type Props = {
  rank: RankSlug;
  tier: "I" | "II" | "III";
  size?: number;
  /** If true, show tier below the badge (e.g. "Elite II"). */
  showTierLabel?: boolean;
  className?: string;
};

const RANK_LABELS: Record<RankSlug, string> = {
  newbie: "Newbie",
  starter: "Starter",
  apprentice: "Apprentice",
  lifter: "Lifter",
  "semi-pro": "Semi-Pro",
  pro: "Pro",
  elite: "Elite",
  master: "Master",
  grandmaster: "Grandmaster",
  titan: "Titan",
  goat: "GOAT",
};

function isRankSlug(s: string): s is RankSlug {
  return (RANK_SLUGS as readonly string[]).includes(s);
}

export function RankBadge({ rank, tier, size = 72, showTierLabel = false, className = "" }: Props) {
  const safeRank: RankSlug = isRankSlug(rank) ? rank : "newbie";
  const tierLabel = safeRank === "goat" ? "GOAT" : `${RANK_LABELS[safeRank]} ${tier}`;
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <Image
        src={`/${safeRank}.png`}
        alt={tierLabel}
        width={size}
        height={size}
        className="h-auto w-auto max-h-full max-w-full object-contain"
        style={{ width: size, height: size }}
        unoptimized
      />
      {showTierLabel && (
        <span className="flex items-center gap-1 text-center text-xs font-medium text-zinc-300">
          {safeRank === "goat" && <GoatIcon size={14} aria-hidden className="shrink-0" />}
          <span>{tierLabel}</span>
        </span>
      )}
    </div>
  );
}
