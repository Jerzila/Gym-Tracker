import { daysBetweenUtcDates, type MaxSessionWeightPoint } from "@/lib/strengthVelocity";

export type TopImprovementsDisplayMetrics = {
  /** Latest chronological weight − first (kg), 1 decimal. */
  totalKg: number;
  /** null → show “calculating rate…” (same calendar day for first vs last workout). */
  rateKgPerMonth: number | null;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Display-only metrics for Top Improvements (does not change velocity / ranking math elsewhere).
 * Uses chronological first vs last logged max weight; rate = total ÷ (days/30), days ≥ 1.
 */
export function computeTopImprovementsDisplayMetrics(
  pts: MaxSessionWeightPoint[]
): TopImprovementsDisplayMetrics | null {
  const indexed = pts
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.date && p.maxWeightKg > 0);
  if (indexed.length < 2) return null;

  indexed.sort((a, b) => {
    const d = a.p.date.localeCompare(b.p.date);
    if (d !== 0) return d;
    return a.i - b.i;
  });

  const first = indexed[0].p;
  const last = indexed[indexed.length - 1].p;
  const totalKg = round1(last.maxWeightKg - first.maxWeightKg);

  const daysRaw = daysBetweenUtcDates(first.date, last.date);
  const days = Math.max(1, daysRaw);

  if (daysRaw === 0) {
    return { totalKg, rateKgPerMonth: null };
  }

  const months = days / 30;
  const rateKgPerMonth = round1(totalKg / months);
  return { totalKg, rateKgPerMonth };
}
