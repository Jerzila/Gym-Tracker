import { epley1RM } from "@/lib/progression";

export type WorkoutWithReps = {
  weight: number;
  date?: string;
  load_type?: "bilateral" | "unilateral";
  average_estimated_1rm?: number | null;
  sets: { reps: number; weight?: number | null }[];
};

/** Max set weight in one workout (kg); falls back to `w.weight` when sets missing. */
function sessionHeaviestWeightKg(w: WorkoutWithReps): number {
  const workoutWeight = Number(w.weight) || 0;
  if (!w.sets?.length) return workoutWeight;
  const maxSet = Math.max(
    ...w.sets.map((s) => {
      const wg = s.weight != null ? Number(s.weight) : workoutWeight;
      return Number(wg) || 0;
    })
  );
  return Number.isFinite(maxSet) ? maxSet : 0;
}

/** Best per-set Epley 1RM for one workout (raw, before global rounding). */
function sessionBestEpley1RM(w: WorkoutWithReps): number {
  if (!w.sets?.length) return 0;
  const workoutWeight = Number(w.weight) || 0;
  const bestSet = Math.max(
    ...w.sets.map((s) => {
      const weightKg = s.weight != null ? Number(s.weight) : workoutWeight;
      return epley1RM(Number(weightKg) || 0, Number(s.reps) || 0);
    })
  );
  return Number.isFinite(bestSet) ? bestSet : 0;
}

export function getHeaviestWeight(workouts: WorkoutWithReps[]): number | null {
  if (workouts.length === 0) return null;
  return Math.max(...workouts.map((w) => Number(w.weight)));
}

/** Highest single-set reps at a given weight (best set at that weight). */
export function getMaxRepsAtWeight(
  workouts: WorkoutWithReps[],
  weight: number
): number | null {
  const atWeight = workouts.filter((w) => Number(w.weight) === weight);
  if (atWeight.length === 0) return null;
  const maxReps = Math.max(
    ...atWeight.flatMap((w) => w.sets.map((s) => s.reps))
  );
  return maxReps;
}

/** Best session 1RM for this exercise (best set). */
export function getBestEstimated1RM(workouts: WorkoutWithReps[]): number | null {
  if (workouts.length === 0) return null;
  let best = 0;
  for (const w of workouts) {
    const v = sessionBestEpley1RM(w);
    if (v > best) best = v;
  }
  return best === 0 ? null : Math.round(best * 10) / 10;
}

export type StrengthProgressResult = {
  /** Latest session max weight minus first session max weight (kg), one decimal. */
  kgChange: number;
  /** Whole percent: ((latest − first) / first) × 100, rounded. */
  percentChange: number;
};

/**
 * Change in heaviest lifted weight from the first logged workout to the most recent.
 */
export function getStrengthProgress(
  workouts: WorkoutWithReps[],
): StrengthProgressResult | null {
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
    kgChange: Math.round(delta * 10) / 10,
    percentChange: Math.round((delta / firstW) * 100),
  };
}
