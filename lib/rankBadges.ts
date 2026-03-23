/**
 * Rank badge mapping: percentile → rank slug, tier, and image path.
 * Badges live at /public/{rank}.png
 */

export const RANK_SLUGS = [
  "newbie",
  "starter",
  "apprentice",
  "lifter",
  "semi-pro",
  "pro",
  "elite",
  "master",
  "grandmaster",
  "titan",
  "goat",
] as const;

export type RankSlug = (typeof RANK_SLUGS)[number];

/** Hex colors for each rank (diagram fill and legend). */
export const RANK_COLORS: Record<RankSlug, string> = {
  newbie: "#6b7280",
  starter: "#9ca3af",
  apprentice: "#60a5fa",
  lifter: "#3b82f6",
  "semi-pro": "#2563eb",
  pro: "#7c3aed",
  elite: "#a855f7",
  master: "#f59e0b",
  grandmaster: "#fde047",
  titan: "#ef4444",
  goat: "#dc2626",
};

/**
 * Return the hex color for a rank slug. Use for muscle diagram fill and legend.
 */
export function getRankColor(rank: RankSlug): string {
  return RANK_COLORS[rank] ?? RANK_COLORS.newbie;
}

/**
 * Legacy coordinate bands for getRank() only. Strength UI uses fixed per-tier "Top X%" labels.
 */
const BANDS: { min: number; max: number; rank: RankSlug }[] = [
  { min: 90, max: 100, rank: "newbie" },
  { min: 80, max: 90, rank: "starter" },
  { min: 70, max: 80, rank: "apprentice" },
  { min: 60, max: 70, rank: "lifter" },
  { min: 50, max: 60, rank: "semi-pro" },
  { min: 35, max: 50, rank: "pro" },
  { min: 20, max: 35, rank: "elite" },
  { min: 10, max: 20, rank: "master" },
  { min: 5, max: 10, rank: "grandmaster" },
  { min: 2, max: 5, rank: "titan" },
  { min: 0, max: 2, rank: "goat" },
];

export type GetRankResult = {
  rank: RankSlug;
  tier: "I" | "II" | "III";
  badge: string;
  /** Display label e.g. "Elite II" */
  rankLabel: string;
};

/** III = bottom third, II = middle, I = top third of band. */
function getTier(percentile: number, min: number, max: number): "I" | "II" | "III" {
  const width = max - min;
  if (width <= 0) return "I";
  const third = width / 3;
  if (percentile < min + third) return "III";
  if (percentile < min + 2 * third) return "II";
  return "I";
}

const RANK_DISPLAY: Record<RankSlug, string> = {
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

/**
 * Exact "Top X%" label per base rank for ladder rows (Tier I of each band; fixed table, not ranges).
 */
export const RANK_TOP_PCT_LABELS: Record<RankSlug, string> = {
  newbie: "Top 96.6%",
  starter: "Top 87.3%",
  apprentice: "Top 78%",
  lifter: "Top 63.3%",
  "semi-pro": "Top 45%",
  pro: "Top 31.6%",
  elite: "Top 21.6%",
  master: "Top 12.3%",
  grandmaster: "Top 6.3%",
  titan: "Top 4%",
  goat: "Top 1%",
};

/** Ladder data for "See All Ranks" UI: rank slug, display name, top % threshold label. */
export const RANK_LADDER: { min: number; max: number; rank: RankSlug; displayName: string; topPctLabel: string }[] =
  BANDS.map((b) => ({
    ...b,
    displayName: b.rank === "goat" ? "GOAT" : RANK_DISPLAY[b.rank],
    topPctLabel: RANK_TOP_PCT_LABELS[b.rank],
  }));

/**
 * Map percentile to rank slug, tier, badge path, and display label.
 * Example: getRank(79) → { rank: "elite", tier: "II", badge: "/elite.png", rankLabel: "Elite II" }
 */
export function getRank(percentile: number): GetRankResult {
  const clamped = Math.max(0, Math.min(100, percentile));
  for (const band of BANDS) {
    const inBand = clamped >= band.min && (band.rank === "goat" ? clamped <= band.max : clamped < band.max);
    if (inBand) {
      const tier = getTier(clamped, band.min, band.max);
      const display = band.rank === "goat" ? "GOAT" : `${RANK_DISPLAY[band.rank]} ${tier}`;
      return {
        rank: band.rank,
        tier,
        badge: `/${band.rank}.png`,
        rankLabel: display,
      };
    }
  }
  return {
    rank: "newbie",
    tier: "I",
    badge: "/newbie.png",
    rankLabel: "Newbie I",
  };
}

export type ProgressToNextResult = {
  /** Progress within current tier 0–100 (0 = start of tier, 100 = end of tier). */
  progressPct: number;
  /** Next tier/rank label, e.g. "Elite III" or "Master I" if at top of rank. */
  nextLabel: string;
  /** Next rank slug for badge (e.g. "elite"). */
  nextRank: RankSlug;
  /** Next tier for badge (e.g. "I"). */
  nextTier: "I" | "II" | "III";
  /** Percentile at start of current tier. */
  tierStart: number;
  /** Percentile at end of current tier. */
  tierEnd: number;
};

/**
 * Progress toward next tier within the same rank, or next rank.
 * Example: 78% overall → progress bar 33% (78 is 1/3 through Elite II), next "Elite III".
 * When percentile is 0 (new user, no data): progress 0%, next "Starter I".
 */
export function getProgressToNextTier(percentile: number): ProgressToNextResult {
  const clamped = Math.max(0, Math.min(100, percentile));
  if (clamped <= 2) {
    return {
      progressPct: 100,
      nextLabel: "GOAT",
      nextRank: "goat",
      nextTier: "I",
      tierStart: 0,
      tierEnd: 2,
    };
  }
  for (const band of BANDS) {
    const inBand = clamped >= band.min && (band.rank === "goat" ? clamped <= band.max : clamped < band.max);
    if (inBand) {
      const width = band.max - band.min;
      const third = width / 3;
      const tier = getTier(clamped, band.min, band.max);
      const tierStart = tier === "III" ? band.min : tier === "II" ? band.min + third : band.min + 2 * third;
      const tierEnd = tier === "III" ? band.min + third : tier === "II" ? band.min + 2 * third : band.max;
      const progressPct =
        tierEnd > tierStart
          ? Math.round(((clamped - tierStart) / (tierEnd - tierStart)) * 100)
          : 100;
      let nextLabel: string;
      let nextRank: RankSlug;
      let nextTier: "I" | "II" | "III";
      if (tier === "I") {
        const nextBand = BANDS[BANDS.indexOf(band) + 1];
        if (nextBand) {
          nextRank = nextBand.rank;
          nextTier = "I";
          nextLabel = nextRank === "goat" ? "GOAT" : `${RANK_DISPLAY[nextRank]} I`;
        } else {
          nextRank = "goat";
          nextTier = "I";
          nextLabel = "GOAT";
        }
      } else {
        nextRank = band.rank;
        nextTier = tier === "III" ? "II" : "I";
        nextLabel = `${RANK_DISPLAY[band.rank]} ${nextTier}`;
      }
      return {
        progressPct: Math.min(100, Math.max(0, progressPct)),
        nextLabel,
        nextRank,
        nextTier,
        tierStart,
        tierEnd,
      };
    }
  }
  return {
    progressPct: 0,
    nextLabel: "Starter I",
    nextRank: "starter",
    nextTier: "I",
    tierStart: 90,
    tierEnd: 100,
  };
}
