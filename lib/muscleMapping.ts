/**
 * Canonical muscle groups for radar chart and heatmap.
 * Category names (from DB) are mapped to one or more of these (case-insensitive).
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
  "Calves",
  "Core",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

const normalized = new Map<string, MuscleGroup>(
  MUSCLE_GROUPS.map((m) => [m.toLowerCase(), m])
);

/**
 * Map a category name to a primary muscle group (single match for radar/legacy).
 * Returns the muscle group or null if no match.
 */
export function categoryToMuscle(categoryName: string): MuscleGroup | null {
  const groups = categoryToMuscleGroups(categoryName);
  return groups.length > 0 ? groups[0] : null;
}

/**
 * Map a category name to one or more muscle groups for the heatmap.
 * Custom categories: Legs → quads + hamstrings + glutes; Upper Back/Lats → back; etc.
 * Used to attribute sets to the correct muscles (splits sets across multiple when needed).
 */
export function categoryToMuscleGroups(categoryName: string): MuscleGroup[] {
  const name = categoryName.trim().toLowerCase();
  if (!name) return [];

  // Direct matches (exact or contains) — single muscle
  if (name.includes("chest")) return ["Chest"];
  if (name.includes("bicep")) return ["Biceps"];
  if (name.includes("tricep")) return ["Triceps"];
  if (name.includes("quad")) return ["Quads"];
  if (name.includes("hamstring")) return ["Hamstrings"];
  if (name.includes("glute")) return ["Glutes"];
  if (name.includes("calf") || name.includes("calves")) return ["Calves"];
  if (name.includes("core") || name.includes("abs") || name.includes("oblique")) return ["Core"];
  if (name.includes("shoulder")) return ["Shoulders"];

  // Back variants
  if (name.includes("back") || name.includes("lat")) return ["Back"];

  // Composite: Legs → quads + hamstrings + glutes
  if (name.includes("leg")) return ["Quads", "Hamstrings", "Glutes"];

  // Lower body (generic) → quads, hamstrings, glutes, calves
  if (name.includes("lower body")) return ["Quads", "Hamstrings", "Glutes", "Calves"];

  // Upper body (generic) → chest, back, shoulders, biceps, triceps
  if (name.includes("upper body")) return ["Chest", "Back", "Shoulders", "Biceps", "Triceps"];

  // Fallback: try exact canonical name
  const single = normalized.get(name);
  return single ? [single] : [];
}
