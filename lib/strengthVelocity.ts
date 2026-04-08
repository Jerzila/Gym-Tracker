import { formatWeight, weightUnitLabel, type WeightUnits } from "@/lib/formatWeight";

/** One workout’s heaviest resolved load (kg) on that date. Multiple rows may share a date. */
export type MaxSessionWeightPoint = { date: string; maxWeightKg: number };

export type MaxSessionWeightByExercise = Record<string, MaxSessionWeightPoint[]>;

const MS_PER_DAY = 86400000;

/** Minimum logged workouts (with valid load) required for velocity. */
export const STRENGTH_VELOCITY_MIN_WORKOUTS = 2;

/** Minimum calendar days between earliest and latest workout date (after same-day collapse). */
export const STRENGTH_VELOCITY_MIN_SPAN_DAYS = 1;

/** Calendar span from ISO date strings (date-only), using noon UTC to avoid DST edge cases. */
export function daysBetweenUtcDates(fromIsoDate: string, toIsoDate: string): number {
  const a = Date.parse(`${fromIsoDate}T12:00:00Z`);
  const b = Date.parse(`${toIsoDate}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / MS_PER_DAY));
}

/** Collapse multiple sessions on the same day to a single max load for that date. */
export function aggregateMaxWeightByDate(points: MaxSessionWeightPoint[]): MaxSessionWeightPoint[] {
  const byDate = new Map<string, number>();
  for (const p of points) {
    if (!p.date || p.maxWeightKg <= 0) continue;
    const prev = byDate.get(p.date) ?? 0;
    byDate.set(p.date, Math.max(prev, p.maxWeightKg));
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, maxWeightKg]) => ({ date, maxWeightKg }));
}

export type StrengthVelocityComputation =
  | { kind: "insufficient"; reason: "too_few_workouts" | "needs_day_gap" }
  | {
      kind: "ok";
      velocityKgPerMonth: number;
      fromKg: number;
      toKg: number;
      fromDate: string;
      toDate: string;
    };

/**
 * Normalized 30-day rate from max load trend:
 * (latest_max − earliest_max) / days_between × 30
 * Requires ≥2 workouts with valid load and ≥1 calendar day between first and last date.
 */
export function computeStrengthVelocityFromMaxWeights(
  rawPerWorkout: MaxSessionWeightPoint[]
): StrengthVelocityComputation {
  const workouts = rawPerWorkout.filter((w) => w.date && w.maxWeightKg > 0);
  if (workouts.length < STRENGTH_VELOCITY_MIN_WORKOUTS) {
    return { kind: "insufficient", reason: "too_few_workouts" };
  }

  const byDate = aggregateMaxWeightByDate(workouts);
  if (byDate.length === 0) return { kind: "insufficient", reason: "too_few_workouts" };

  const earliest = byDate[0];
  const latest = byDate[byDate.length - 1];
  const days = daysBetweenUtcDates(earliest.date, latest.date);
  if (days < STRENGTH_VELOCITY_MIN_SPAN_DAYS) {
    return { kind: "insufficient", reason: "needs_day_gap" };
  }

  const delta = latest.maxWeightKg - earliest.maxWeightKg;
  const velocityKgPerMonth = (delta / days) * 30;

  return {
    kind: "ok",
    velocityKgPerMonth: Math.round(velocityKgPerMonth * 10) / 10,
    fromKg: Math.round(earliest.maxWeightKg * 10) / 10,
    toKg: Math.round(latest.maxWeightKg * 10) / 10,
    fromDate: earliest.date,
    toDate: latest.date,
  };
}

export function formatStrengthVelocityLine(kgPerMonth: number, units: WeightUnits): string {
  const num = formatWeight(kgPerMonth, { units, signed: kgPerMonth > 0 });
  const label = weightUnitLabel(units);
  return `${num} ${label} / month`;
}

export type TopStrengthVelocityRow = {
  exerciseId: string;
  name: string;
  velocityKgPerMonth: number;
  fromKg: number;
  toKg: number;
};

/**
 * Rank exercises by positive strength velocity (max load trend). Timed lifts excluded by caller.
 */
export function topStrengthVelocitiesByExercise(
  byExercise: MaxSessionWeightByExercise,
  exerciseMeta: { id: string; name: string; include: boolean }[],
  limit = 3
): TopStrengthVelocityRow[] {
  const includeById = new Map(exerciseMeta.map((e) => [e.id, e.include]));
  const nameById = new Map(exerciseMeta.map((e) => [e.id, e.name]));

  const rows: TopStrengthVelocityRow[] = [];
  for (const [exerciseId, pts] of Object.entries(byExercise)) {
    if (includeById.get(exerciseId) === false) continue;
    const r = computeStrengthVelocityFromMaxWeights(pts);
    if (r.kind !== "ok" || r.velocityKgPerMonth <= 0) continue;
    rows.push({
      exerciseId,
      name: nameById.get(exerciseId) ?? "Exercise",
      velocityKgPerMonth: r.velocityKgPerMonth,
      fromKg: r.fromKg,
      toKg: r.toKg,
    });
  }
  rows.sort((a, b) => b.velocityKgPerMonth - a.velocityKgPerMonth);
  return rows.slice(0, limit);
}
