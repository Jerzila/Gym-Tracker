"use client";

import { Crown } from "lucide-react";

type Props = { className?: string; size?: number; title?: string };

/** Golden crown for Liftly Pro subscribers (see `lib/showRankCrown`). */
export function RankCrownIcon({ className = "", size = 16, title = "Liftly Pro" }: Props) {
  return (
    <Crown
      className={`inline-block shrink-0 fill-amber-400 stroke-amber-600 text-amber-400 [stroke-linejoin:round] ${className}`}
      size={size}
      strokeWidth={1.35}
      role="img"
      aria-label={title}
    />
  );
}
