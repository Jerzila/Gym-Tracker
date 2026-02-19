/**
 * Epley formula: 1RM = weight × (1 + reps / 30)
 */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/**
 * Double progression: suggest next step based on rep_min/rep_max and set reps.
 * Returns the message to show after saving a workout.
 */
export function getProgressiveOverloadMessage(
  repMin: number,
  repMax: number,
  setReps: number[]
): string {
  if (setReps.length === 0) return "";

  const allAtOrAboveMax = setReps.every((r) => r >= repMax);
  const anyBelowMin = setReps.some((r) => r < repMin);

  if (allAtOrAboveMax) return "Increase weight next session";
  if (anyBelowMin) return "Weight too heavy or stay at this weight";
  return "Stay at this weight until you hit the top of the range";
}
