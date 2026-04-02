import type { LoadType } from "@/lib/loadType";
import { normalizeLoadType } from "@/lib/loadType";
import {
  sessionBestStrengthSetFromSets,
  sessionEstimated1RMFromSets,
  type SessionSetRow,
  type SessionStrengthContext,
} from "@/lib/sessionStrength";

export type WorkoutWithReps = {
  weight: number;
  date?: string;
  load_type?: LoadType;
  /** Bodyweight exercises: category-based fraction of BW (omit = 1). */
  bodyweight_load_fraction?: number;
  average_estimated_1rm?: number | null;
  sets: { reps: number; weight?: number | null }[];
};

function strengthContextForWorkout(
  w: WorkoutWithReps,
  loadType: LoadType,
  getBodyweightKgForDate?: (isoDate: string) => number
): SessionStrengthContext | undefined {
  if (loadType !== "bodyweight" || !getBodyweightKgForDate || !w.date) return undefined;
  return {
    userBodyweightKg: getBodyweightKgForDate(w.date),
    bodyweightLoadFraction: w.bodyweight_load_fraction ?? 1,
  };
}

/** Max set weight in one workout (kg); falls back to `w.weight` when sets missing. */
function sessionHeaviestWeightKg(w: WorkoutWithReps): number {
  const workoutWeight = Number(w.weight) || 0;
  if (normalizeLoadType(w.load_type) === "bodyweight") return workoutWeight;
  if (!w.sets?.length) return workoutWeight;
  const maxSet = Math.max(
    ...w.sets.map((s) => {
      const wg = s.weight != null ? Number(s.weight) : workoutWeight;
      return Number(wg) || 0;
    })
  );
  return Number.isFinite(maxSet) ? maxSet : 0;
}

/** Best-session Epley 1RM: heaviest logged load paired with reps from that load only. */
function sessionBestEpley1RM(
  w: WorkoutWithReps,
  getBodyweightKgForDate?: (isoDate: string) => number
): number {
  if (!w.sets?.length) return 0;
  const workoutWeight = Number(w.weight) || 0;
  const loadType = normalizeLoadType(w.load_type);
  const ctx = strengthContextForWorkout(w, loadType, getBodyweightKgForDate);
  return sessionEstimated1RMFromSets(w.sets as SessionSetRow[], workoutWeight, loadType, ctx);
}

/** Best strength set for charts (highest bar weight + its reps). */
export function getSessionBestStrengthSet(
  w: WorkoutWithReps,
  getBodyweightKgForDate?: (isoDate: string) => number
) {
  if (!w.sets?.length) return null;
  const workoutWeight = Number(w.weight) || 0;
  const loadType = normalizeLoadType(w.load_type);
  const ctx = strengthContextForWorkout(w, loadType, getBodyweightKgForDate);
  return sessionBestStrengthSetFromSets(w.sets as SessionSetRow[], workoutWeight, loadType, ctx);
}

export function getHeaviestWeight(workouts: WorkoutWithReps[]): number | null {
  if (workouts.length === 0) return null;
  return Math.max(...workouts.map((w) => Number(w.weight)));
}

function effectiveKgForSet(
  w: WorkoutWithReps,
  s: { reps: number; weight?: number | null },
  loadType: LoadType,
  getBodyweightKgForDate?: (isoDate: string) => number
): number {
  if (loadType === "bodyweight" && getBodyweightKgForDate && w.date) {
    const frac = w.bodyweight_load_fraction ?? 1;
    const bw = getBodyweightKgForDate(w.date) * frac;
    const ex =
      s.weight != null && Number.isFinite(Number(s.weight)) ? Math.max(0, Number(s.weight)) : 0;
    return bw + ex;
  }
  const fallback = Number(w.weight) || 0;
  const kg = s.weight != null ? Number(s.weight) : fallback;
  const rw = Number.isFinite(kg) && kg > 0 ? kg : fallback;
  return rw;
}

/** Highest reps on a set at exactly `weight` kg (ignores lighter sets in the same workout). */
export function getMaxRepsAtWeight(
  workouts: WorkoutWithReps[],
  weight: number,
  loadType?: unknown,
  getBodyweightKgForDate?: (isoDate: string) => number
): number | null {
  const target = Number(weight);
  if (!Number.isFinite(target) || target <= 0) return null;
  const t = normalizeLoadType(loadType);
  let best: number | null = null;
  for (const w of workouts) {
    for (const s of w.sets ?? []) {
      const rw = effectiveKgForSet(w, s, t, getBodyweightKgForDate);
      if (Math.abs(rw - target) > 0.001) continue;
      const reps = Number(s.reps) || 0;
      if (best == null || reps > best) best = reps;
    }
  }
  return best;
}

/** Best session 1RM for this exercise (best set). */
export function getBestEstimated1RM(
  workouts: WorkoutWithReps[],
  getBodyweightKgForDate?: (isoDate: string) => number
): number | null {
  if (workouts.length === 0) return null;
  let best = 0;
  for (const w of workouts) {
    const v = sessionBestEpley1RM(w, getBodyweightKgForDate);
    if (v > best) best = v;
  }
  return best === 0 ? null : Math.round(best * 10) / 10;
}

export type StrengthProgressResult =
  | {
      kind: "weight";
      /** Latest session max weight minus first session max weight (kg), one decimal. */
      kgChange: number;
      /** Whole percent: ((latest − first) / first) × 100, rounded. */
      percentChange: number;
    }
  | {
      kind: "reps";
      /** Latest session best single-set reps minus first session's. */
      repChange: number;
      /** Whole percent: (repChange / firstBestReps) × 100, rounded. */
      percentChange: number;
    };

/** Max reps in any set for one workout. */
export function sessionMaxRepsInWorkout(w: WorkoutWithReps): number {
  if (!w.sets?.length) return 0;
  let best = 0;
  for (const s of w.sets) {
    const r = Number(s.reps) || 0;
    if (r > best) best = r;
  }
  return best;
}

/** Highest reps achieved in a single set across all logged workouts. */
export function getBestReps(workouts: WorkoutWithReps[]): number | null {
  if (workouts.length === 0) return null;
  let best = 0;
  for (const w of workouts) {
    const m = sessionMaxRepsInWorkout(w);
    if (m > best) best = m;
  }
  return best > 0 ? best : null;
}

/**
 * Rep-based progress: compare max reps in a single set on the earliest vs latest workout.
 */
export function getRepsStrengthProgress(workouts: WorkoutWithReps[]): Extract<
  StrengthProgressResult,
  { kind: "reps" }
> | null {
  if (workouts.length === 0) return null;
  const sorted = [...workouts].sort((a, b) => {
    const da = a.date ?? "";
    const db = b.date ?? "";
    return da.localeCompare(db);
  });
  const firstBest = sessionMaxRepsInWorkout(sorted[0]);
  const latestBest = sessionMaxRepsInWorkout(sorted[sorted.length - 1]);
  if (firstBest <= 0 || latestBest <= 0) return null;
  const repChange = latestBest - firstBest;
  return {
    kind: "reps",
    repChange,
    percentChange: Math.round((repChange / firstBest) * 100),
  };
}

/**
 * Change in heaviest lifted weight from the first logged workout to the most recent.
 */
export function getStrengthProgress(workouts: WorkoutWithReps[]): Extract<
  StrengthProgressResult,
  { kind: "weight" }
> | null {
  if (workouts.length === 0) return null;
  const sorted = [...workouts].sort((a, b) => {
    const da = a.date ?? "";
    const db = b.date ?? "";
    return da.localeCompare(db);
  });
  const firstW = sessionHeaviestWeightKg(sorted[0]);
  const latestW = sessionHeaviestWeightKg(sorted[sorted.length - 1]);
  if (firstW <= 0 || latestW <= 0) return null;
  const delta = latestW - firstW;
  return {
    kind: "weight",
    kgChange: Math.round(delta * 10) / 10,
    percentChange: Math.round((delta / firstW) * 100),
  };
}
