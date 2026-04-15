import { getStepsForMuscle, type StrengthRankMuscle } from "@/lib/strengthRanking";

/**
 * Monotonic strength order for a muscle: 0 = weakest step, higher = stronger.
 * Used to detect true rank-tier progression (not percentage-only moves within a tier).
 */
export function muscleRankStrengthOrdinal(
  muscle: StrengthRankMuscle,
  rank: string,
  tier: "I" | "II" | "III"
): number {
  const steps = getStepsForMuscle(muscle);
  const asc = [...steps].sort((a, b) => a.threshold - b.threshold);
  const r = rank.trim();
  const idx = asc.findIndex((s) => s.baseRank === r && s.tier === tier);
  if (idx >= 0) return idx;
  if (r === "GOAT") {
    const g = asc.findIndex((s) => s.baseRank === "GOAT");
    if (g >= 0) return g;
  }
  return -1;
}
