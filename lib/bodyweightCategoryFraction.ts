/**
 * Fraction of user bodyweight used as the "lifted" portion for bodyweight loadType.
 * Category names come from user-defined labels; matched case-insensitively by keyword
 * (same style as muscle / strength mapping elsewhere).
 */
export function bodyweightLoadFractionFromCategoryName(categoryName: string): number {
  const name = categoryName.trim().toLowerCase();
  if (!name) return 1;

  if (name.includes("upper body")) return 1;

  if (name.includes("lower body")) return 0.75;

  if (
    name.includes("leg") ||
    name.includes("quad") ||
    name.includes("hamstring") ||
    name.includes("glute") ||
    name.includes("calf") ||
    name.includes("squat") ||
    name.includes("deadlift") ||
    name.includes("lunge")
  ) {
    return 0.75;
  }

  if (name.includes("chest")) return 0.64;
  if (name.includes("back") || name.includes("lat")) return 1;
  if (name.includes("tricep")) return 0.95;
  if (name.includes("shoulder")) return 0.7;
  if (name.includes("trap") || name.includes("trapez")) return 0.7;
  if (name.includes("core") || name.includes("abs") || name.includes("oblique")) return 0.4;
  if (name.includes("bicep")) return 1;
  if (name.includes("forearm") || name.includes("wrist") || name.includes("grip")) return 1;

  return 1;
}

/** When an exercise is in multiple categories, use the highest bodyweight fraction among them. */
export function bodyweightLoadFractionFromCategoryNames(categoryNames: readonly string[]): number {
  const names = [...categoryNames].map((s) => s.trim()).filter(Boolean);
  if (names.length === 0) return 1;
  let max = 0;
  for (const n of names) {
    const f = bodyweightLoadFractionFromCategoryName(n);
    if (f > max) max = f;
  }
  return max > 0 ? max : 1;
}
