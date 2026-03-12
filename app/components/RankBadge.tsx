"use client";

import Image from "next/image";
import type { RankSlug } from "@/lib/rankBadges";

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

export function RankBadge({ rank, tier, size = 72, showTierLabel = false, className = "" }: Props) {
  const tierLabel = rank === "goat" ? "GOAT 🐐" : `${RANK_LABELS[rank]} ${tier}`;
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <Image
        src={`/${rank || "newbie"}.png`}
        alt={tierLabel}
        width={size}
        height={size}
        className="h-auto w-auto max-h-full max-w-full object-contain"
        style={{ width: size, height: size }}
        unoptimized
      />
      {showTierLabel && (
        <span className="text-center text-xs font-medium text-zinc-300">{tierLabel}</span>
      )}
    </div>
  );
}
