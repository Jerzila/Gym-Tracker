import { epley1RM } from "@/lib/progression";

export type WorkoutWithReps = { weight: number; sets: { reps: number }[] };

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

/** Best estimated 1RM across all sets for this exercise. */
export function getBestEstimated1RM(workouts: WorkoutWithReps[]): number | null {
  if (workouts.length === 0) return null;
  let best = 0;
  for (const w of workouts) {
    const weight = Number(w.weight);
    for (const s of w.sets) {
      const rm = epley1RM(weight, s.reps);
      if (rm > best) best = rm;
    }
  }
  return best === 0 ? null : Math.round(best * 10) / 10;
}
