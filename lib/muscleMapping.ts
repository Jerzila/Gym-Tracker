/**
 * Canonical muscle groups for the radar chart.
 * Category names (from DB) are mapped to one of these (case-insensitive match).
 */
export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

const normalized = new Map<string, MuscleGroup>(
  MUSCLE_GROUPS.map((m) => [m.toLowerCase(), m])
);

/**
 * Map a category name to a primary muscle group.
 * Returns the muscle group or null if no match (e.g. "Core").
 */
export function categoryToMuscle(categoryName: string): MuscleGroup | null {
  return normalized.get(categoryName.trim().toLowerCase()) ?? null;
}
