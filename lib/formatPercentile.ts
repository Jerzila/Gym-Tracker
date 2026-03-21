/**
 * Strength percentile (0–100): higher = stronger than more lifters.
 * rankBadges getRank() uses legacy coordinates where higher = weaker.
 */
export function strengthPercentileToRankCoord(strengthPercentile: number): number {
  const p = Math.max(0, Math.min(100, strengthPercentile));
  return 100 - p;
}

/**
 * "Top X%" for lifters: stronger percentile → smaller X.
 * e.g. 95th percentile → "Top 5%"; 100 → "Top 1%" (not 0%).
 */
export function formatTopPercentDisplay(strengthPercentile: number): string {
  const p = Math.max(0, Math.min(100, strengthPercentile));
  const topPercent = Math.max(1, Math.min(100, Math.round(100 - p)));
  return `Top ${topPercent}%`;
}
