/**
 * Display "Top X%" for strength ranking.
 * The ranking system passes the "top X%" value (e.g. 18 = top 18% of lifters).
 * So Master I with value 18 should display "Top 18%" (not "Top 82%").
 * We only round and clamp 1–100; no conversion.
 */
export function formatTopPercentDisplay(topXPercent: number): string {
  const topPercent = Math.min(100, Math.max(1, Math.round(topXPercent)));
  return `Top ${topPercent}%`;
}
