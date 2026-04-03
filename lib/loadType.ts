export type LoadType = "weight" | "unilateral" | "bodyweight" | "timed";

export function normalizeLoadType(value: unknown): LoadType {
  if (value === "unilateral") return "unilateral";
  if (value === "bodyweight") return "bodyweight";
  if (value === "timed") return "timed";
  if (value === "weight") return "weight";
  // Legacy DB value
  if (value === "bilateral") return "weight";
  return "weight";
}

/**
 * `weight` is the workout row's reference load (max logged bar weight, or max effective load for bodyweight).
 * For bodyweight exercises, stored workout weight is the session max effective load:
 * (bodyweight × category fraction) + extra; do not scale again here.
 */
export function getEffectiveWeight(weight: number, loadType: unknown): number {
  const numericWeight = Number(weight);
  const safeWeight = Number.isFinite(numericWeight) ? numericWeight : 0;
  const t = normalizeLoadType(loadType);
  if (t === "unilateral") return safeWeight * 2;
  /** Timed: `workouts.weight` stores session best time (seconds). */
  if (t === "timed") return safeWeight;
  return safeWeight;
}
