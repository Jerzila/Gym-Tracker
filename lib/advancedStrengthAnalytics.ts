import type { LoadType } from "@/lib/loadType";
import {
  resolvedSetWeightKg,
  sessionEstimated1RMFromSets,
  sessionMaxResolvedLoadKg,
  type SessionSetRow,
  type SessionStrengthContext,
} from "@/lib/sessionStrength";
import { aggregateMaxWeightByDate, daysBetweenUtcDates, type MaxSessionWeightPoint } from "@/lib/strengthVelocity";

/** Minimum global sample size before showing percentile vs population. */
export const GLOBAL_VELOCITY_MIN_SAMPLE_COUNT = 40;

export type E1RMPoint = { date: string; estimated1RM: number };

export type VelocityBenchmarkPercentiles = {
  sample_count: number;
  p10_kg_per_month: number;
  p25_kg_per_month: number;
  p50_kg_per_month: number;
  p75_kg_per_month: number;
  p90_kg_per_month: number;
};

export function normalizeExerciseNameForBenchmark(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Map user's kg/month velocity to an approximate percentile (0–99) using tabulated population percentiles.
 */
export function estimateGlobalPercentileFromVelocity(
  velocityKgPerMonth: number,
  b: VelocityBenchmarkPercentiles | null
): number | null {
  if (!b || b.sample_count < GLOBAL_VELOCITY_MIN_SAMPLE_COUNT) return null;
  const p10 = Number(b.p10_kg_per_month);
  const p25 = Number(b.p25_kg_per_month);
  const p50 = Number(b.p50_kg_per_month);
  const p75 = Number(b.p75_kg_per_month);
  const p90 = Number(b.p90_kg_per_month);
  if (![p10, p25, p50, p75, p90].every((x) => Number.isFinite(x))) return null;

  const segments: { v: number; p: number }[] = [
    { v: p10, p: 10 },
    { v: p25, p: 25 },
    { v: p50, p: 50 },
    { v: p75, p: 75 },
    { v: p90, p: 90 },
  ].sort((a, b2) => a.v - b2.v);

  const v = velocityKgPerMonth;
  const lo = segments[0];
  if (v <= lo.v) {
    if (lo.v <= 0) return Math.max(0, Math.min(10, 50 + v * 5));
    return Math.max(0, Math.min(10, (v / lo.v) * 10));
  }

  for (let i = 0; i < segments.length - 1; i++) {
    const a = segments[i];
    const c = segments[i + 1];
    if (v <= c.v) {
      const span = c.v - a.v;
      if (span <= 0) return c.p;
      const t = (v - a.v) / span;
      return Math.round(a.p + t * (c.p - a.p));
    }
  }

  const hi = segments[segments.length - 1];
  const prev = segments[segments.length - 2];
  const span = Math.max(0.01, hi.v - prev.v);
  return Math.min(99, Math.round(90 + ((v - hi.v) / span) * 9));
}

function collapseE1RMByDate(points: E1RMPoint[]): { dates: string[]; values: number[] } {
  const byDate = new Map<string, number>();
  for (const p of points) {
    if (!p.date || p.estimated1RM <= 0) continue;
    const prev = byDate.get(p.date) ?? 0;
    byDate.set(p.date, Math.max(prev, p.estimated1RM));
  }
  const dates = [...byDate.keys()].sort((a, b) => a.localeCompare(b));
  return { dates, values: dates.map((d) => byDate.get(d)!) };
}

export function computeProgressTrendKg(
  points: E1RMPoint[],
  windowDays = 90
): { deltaKg: number; windowLabel: string; usedDays: number } | null {
  const { dates, values } = collapseE1RMByDate(points);
  if (dates.length === 0) return null;
  const latest = values[values.length - 1];
  const latestDate = dates[dates.length - 1];

  const cutoff = new Date(`${latestDate}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  let baselineIdx = -1;
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] <= cutoffStr) {
      baselineIdx = i;
      break;
    }
  }
  if (baselineIdx < 0) baselineIdx = 0;

  const baseline = values[baselineIdx];
  const baselineDate = dates[baselineIdx];
  const deltaKg = Math.round((latest - baseline) * 10) / 10;
  const usedDays = Math.max(0, daysBetweenUtcDates(baselineDate, latestDate));
  const windowLabel =
    usedDays >= windowDays - 2 ? `Last ${windowDays} days` : `Since ${formatShortMonthDay(baselineDate)}`;
  return { deltaKg, windowLabel, usedDays };
}

function formatShortMonthDay(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatMonthArrowMonth(isoStart: string, isoEnd: string): string {
  const a = new Date(`${isoStart}T12:00:00Z`);
  const b = new Date(`${isoEnd}T12:00:00Z`);
  const ma = a.toLocaleDateString("en-US", { month: "long" });
  const mb = b.toLocaleDateString("en-US", { month: "long" });
  if (ma === mb) return ma;
  return `${ma} → ${mb}`;
}

const TRAINING_FREQ_WINDOW_DAYS = 90;

export type ComputeTrainingFrequencyResult =
  | { kind: "ok"; sessionsPerWeek: number; sessions: number; spanDays: number }
  | { kind: "one_session" }
  | { kind: "insufficient" };

/**
 * Sessions per week over a rolling window: (session_count ÷ day_span) × 7.
 * Day span is calendar days from first to last session in the window (min 1 to avoid div-by-zero).
 * Not clamped to ≥1 session/week.
 */
export function computeTrainingFrequency(
  sessionDates: string[],
  windowDays = TRAINING_FREQ_WINDOW_DAYS
): ComputeTrainingFrequencyResult {
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(`${today}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const inWindow = sessionDates.filter((d) => d && d >= cutoffStr && d <= today);
  const sessions = inWindow.length;

  if (sessions === 0) return { kind: "insufficient" };
  if (sessions === 1) return { kind: "one_session" };

  const sorted = [...inWindow].sort((a, b) => a.localeCompare(b));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const spanDays = Math.max(1, daysBetweenUtcDates(first, last));
  const sessionsPerWeek = Math.round(((sessions / spanDays) * 7) * 10) / 10;
  return { kind: "ok", sessionsPerWeek, sessions, spanDays };
}

/** Best calendar ~30-day gain using first/last day strength inside the window (max over windows). */
export function computeBestProgressPeriod(
  points: E1RMPoint[],
  windowDays = 30
): { startDate: string; endDate: string; gainKg: number } | null {
  const { dates, values } = collapseE1RMByDate(points);
  if (dates.length < 2) return null;

  let bestGain = 0;
  let bestStart = "";
  let bestEnd = "";

  for (let i = 0; i < dates.length; i++) {
    const startDate = dates[i];
    const startVal = values[i];
    const endLimit = new Date(`${startDate}T12:00:00Z`);
    endLimit.setUTCDate(endLimit.getUTCDate() + windowDays);
    const limitStr = endLimit.toISOString().slice(0, 10);

    let endVal = startVal;
    let endDate = startDate;
    for (let j = i; j < dates.length && dates[j] <= limitStr; j++) {
      endVal = values[j];
      endDate = dates[j];
    }
    const gain = Math.round((endVal - startVal) * 10) / 10;
    if (gain > bestGain) {
      bestGain = gain;
      bestStart = startDate;
      bestEnd = endDate;
    }
  }

  if (bestGain <= 0 || !bestStart || !bestEnd) return null;
  return { startDate: bestStart, endDate: bestEnd, gainKg: bestGain };
}

/** Distinct workout days with load, after aggregating same-day maxes. */
const TOTAL_PROGRESS_MIN_DAYS = 3;

export type TotalProgressFromMaxWeightsResult =
  | { kind: "insufficient" }
  | { kind: "ok"; deltaKg: number };

/**
 * Total change in heaviest session load from first to last recorded day (kg).
 * Requires at least three distinct days with valid load.
 */
export function computeTotalProgressFromMaxWeights(
  raw: MaxSessionWeightPoint[]
): TotalProgressFromMaxWeightsResult {
  const byDate = aggregateMaxWeightByDate(raw.filter((w) => w.date && w.maxWeightKg > 0));
  if (byDate.length < TOTAL_PROGRESS_MIN_DAYS) return { kind: "insufficient" };
  const earliest = byDate[0];
  const latest = byDate[byDate.length - 1];
  const deltaKg = Math.round((latest.maxWeightKg - earliest.maxWeightKg) * 10) / 10;
  return { kind: "ok", deltaKg };
}

const PROGRESS_RATE_LOOKBACK_DAYS = 90;
/** Advanced analytics: progress rate + exercise rank eligibility */
const ANALYTICS_RATE_MIN_WORKOUTS = 2;
const ANALYTICS_RATE_MIN_SPAN_DAYS = 7;

export type ProgressRateFromMaxWeightsResult =
  | { kind: "insufficient" }
  | {
      kind: "ok";
      percentPerMonth: number;
      totalPercentIncrease: number;
      kgPerMonth: number;
      totalDeltaKg: number;
    };

/** Ignore % when baseline load is too small for stable percentages. */
const ANALYTICS_PERCENT_MIN_START_KG = 1;
/** Cap total % swing from tiny baselines (after earliest ≥ min). */
const ANALYTICS_PERCENT_MAX_TOTAL = 500;
/** Cap implied monthly % to limit display / rank outliers. */
const ANALYTICS_PERCENT_MAX_MONTHLY = 300;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Strength progress as %: total change earliest→latest max load, and % per 30-day month.
 * Requires ≥2 workouts, ≥7 calendar days span, earliest load ≥ 1 kg.
 */
function computeAnalyticsPercentProgressFromMaxLoads(
  raw: MaxSessionWeightPoint[],
  lookbackDays?: number
): ProgressRateFromMaxWeightsResult {
  let pts = raw.filter((w) => w.date && w.maxWeightKg > 0);
  if (lookbackDays != null) {
    const today = new Date().toISOString().slice(0, 10);
    const cutoff = new Date(`${today}T12:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - lookbackDays);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    pts = pts.filter((p) => p.date >= cutoffStr && p.date <= today);
  }

  if (pts.length < ANALYTICS_RATE_MIN_WORKOUTS) return { kind: "insufficient" };

  const byDate = aggregateMaxWeightByDate(pts);
  const earliest = byDate[0];
  const latest = byDate[byDate.length - 1];
  const daySpan = daysBetweenUtcDates(earliest.date, latest.date);
  if (daySpan < ANALYTICS_RATE_MIN_SPAN_DAYS) return { kind: "insufficient" };

  const ew = earliest.maxWeightKg;
  const lw = latest.maxWeightKg;
  if (ew < ANALYTICS_PERCENT_MIN_START_KG) return { kind: "insufficient" };

  const rawTotalPct = ((lw - ew) / ew) * 100;
  const monthsTracked = daySpan / 30;
  const totalPercentIncrease = Math.round(clamp(rawTotalPct, -ANALYTICS_PERCENT_MAX_TOTAL, ANALYTICS_PERCENT_MAX_TOTAL) * 10) / 10;
  const monthlyUncapped = totalPercentIncrease / monthsTracked;
  const percentPerMonth =
    Math.round(clamp(monthlyUncapped, -ANALYTICS_PERCENT_MAX_MONTHLY, ANALYTICS_PERCENT_MAX_MONTHLY) * 10) / 10;

  const totalDeltaKg = Math.round((lw - ew) * 10) / 10;
  const kgPerMonth = Math.round(((lw - ew) / daySpan) * 30 * 10) / 10;

  return { kind: "ok", percentPerMonth, totalPercentIncrease, kgPerMonth, totalDeltaKg };
}

/**
 * Progress rate for the analytics card: last `lookbackDays` only (default 90).
 */
export function computeProgressRateFromMaxWeights(
  raw: MaxSessionWeightPoint[],
  lookbackDays = PROGRESS_RATE_LOOKBACK_DAYS
): ProgressRateFromMaxWeightsResult {
  return computeAnalyticsPercentProgressFromMaxLoads(raw, lookbackDays);
}

/** Lifetime %/month for ranking exercises (full history, same rules). */
export function computeLifetimeProgressRatePercentFromMaxLoads(
  raw: MaxSessionWeightPoint[]
): ProgressRateFromMaxWeightsResult {
  return computeAnalyticsPercentProgressFromMaxLoads(raw);
}

const CONSISTENCY_MIN_SESSIONS = 3;

/**
 * Coefficient of variation of session max resolved load (sample stdev / mean), as a percentage.
 * One entry per workout row (same shape as `maxSessionWeightByExercise` from chart series).
 */
export function computeConsistencyCvFromSessionMaxLoads(
  points: MaxSessionWeightPoint[]
): {
  cvPercent: number;
  bandLabel: string;
  trend: "positive" | "neutral" | "negative";
} | null {
  const loads = points.map((p) => p.maxWeightKg).filter((x) => x > 0);
  if (loads.length < CONSISTENCY_MIN_SESSIONS) return null;

  const n = loads.length;
  const mean = loads.reduce((a, b) => a + b, 0) / n;
  if (mean <= 0) return null;

  let ss = 0;
  for (const x of loads) ss += (x - mean) * (x - mean);
  const std = Math.sqrt(ss / (n - 1));
  const cv = std / mean;
  const cvPercent = Math.round(cv * 1000) / 10;

  const bandLabel =
    cvPercent < 6 ? "Very consistent" : cvPercent < 10 ? "Moderate variation" : "Inconsistent performance";
  const trend: "positive" | "neutral" | "negative" =
    cvPercent < 6 ? "positive" : cvPercent < 10 ? "neutral" : "negative";

  return { cvPercent, bandLabel, trend };
}

export type PrAnalysisWorkout = {
  id: string;
  date: string;
  weightFallbackKg: number;
  sets: SessionSetRow[];
  loadType: LoadType;
  bwCtx?: SessionStrengthContext;
};

/**
 * Counts workouts where the user sets any new best for this exercise: heavier max load,
 * higher estimated 1RM, or more reps at the same resolved load (rounded to 0.1 kg).
 * At most one PR flag per workout. Timed exercises are ignored.
 */
export function countPersonalRecordWorkoutsFromHistory(
  rows: PrAnalysisWorkout[]
): { workoutCount: number; prWorkoutCount: number } {
  const sorted = [...rows].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    return d !== 0 ? d : a.id.localeCompare(b.id);
  });

  let bestLoad = 0;
  let bestE1 = 0;
  const bestRepsByWeightKey = new Map<number, number>();
  let prWorkoutCount = 0;
  let workoutCount = 0;

  for (const w of sorted) {
    if (w.loadType === "timed") continue;
    workoutCount++;

    const maxLoad = sessionMaxResolvedLoadKg(
      w.sets,
      w.weightFallbackKg,
      w.loadType,
      w.bwCtx
    );
    const e1 = sessionEstimated1RMFromSets(
      w.sets,
      w.weightFallbackKg,
      w.loadType,
      w.bwCtx
    );

    let isPr = false;
    if (maxLoad > bestLoad) isPr = true;
    if (e1 > bestE1) isPr = true;

    const sessionByWeight = new Map<number, number>();
    for (const s of w.sets) {
      const kg = resolvedSetWeightKg(s, w.weightFallbackKg, w.loadType, w.bwCtx);
      if (kg <= 0) continue;
      const r = Math.max(0, Number(s.reps) || 0);
      const key = Math.round(kg * 10) / 10;
      sessionByWeight.set(key, Math.max(sessionByWeight.get(key) ?? 0, r));
    }
    for (const [k, r] of sessionByWeight) {
      if (r > (bestRepsByWeightKey.get(k) ?? 0)) isPr = true;
    }

    if (isPr) prWorkoutCount++;

    bestLoad = Math.max(bestLoad, maxLoad);
    bestE1 = Math.max(bestE1, e1);
    for (const [k, r] of sessionByWeight) {
      bestRepsByWeightKey.set(k, Math.max(bestRepsByWeightKey.get(k) ?? 0, r));
    }
  }

  return { workoutCount, prWorkoutCount };
}

const MIN_EXERCISES_FOR_IMPROVEMENT_RANK = 3;

export type ExerciseImprovementRankResult =
  | { kind: "insufficient_pool" }
  | { kind: "insufficient_self"; totalRanked: number }
  | { kind: "ok"; rank: number; total: number };

/**
 * Ranks exercises by lifetime %/month (same rules as analytics progress rate).
 * Requires at least three qualifying exercises; selected exercise must also qualify.
 */
export function computeExerciseImprovementRank(
  maxSessionWeightByExercise: Record<string, MaxSessionWeightPoint[]>,
  selectedExerciseId: string
): ExerciseImprovementRankResult {
  const scored: { id: string; percentPerMonth: number }[] = [];
  for (const [id, pts] of Object.entries(maxSessionWeightByExercise)) {
    const comp = computeLifetimeProgressRatePercentFromMaxLoads(pts);
    if (comp.kind === "ok") scored.push({ id, percentPerMonth: comp.percentPerMonth });
  }
  scored.sort((a, b) => b.percentPerMonth - a.percentPerMonth || a.id.localeCompare(b.id));

  if (scored.length < MIN_EXERCISES_FOR_IMPROVEMENT_RANK) {
    return { kind: "insufficient_pool" };
  }

  const idx = scored.findIndex((e) => e.id === selectedExerciseId);
  if (idx < 0) {
    return { kind: "insufficient_self", totalRanked: scored.length };
  }

  return { kind: "ok", rank: idx + 1, total: scored.length };
}
