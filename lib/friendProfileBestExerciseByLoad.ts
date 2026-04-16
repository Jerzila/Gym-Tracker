import type { StrengthRankingComputeBundle } from "@/lib/computeStrengthRankingForUser";

export type FriendBestExerciseByLoad = {
  exerciseName: string;
  /** Primary category label used for the “heaviest in …” line */
  categoryName: string;
  /** Max resolved kg in any session among all exercises in `categoryName` (same as their global heaviest session) */
  heaviestKgInCategory: number;
};

/**
 * Pick the exercise with the highest session resolved load (kg), then report the heaviest
 * session load among every exercise that shares its primary category name.
 */
export function buildFriendBestExerciseByLoadFromBundle(
  bundle: StrengthRankingComputeBundle
): FriendBestExerciseByLoad | null {
  const loads = bundle.maxSessionResolvedKgByExercise;
  const candidates = bundle.allExercises
    .map((ex) => {
      const kg = loads[ex.id];
      return Number.isFinite(kg) && kg > 0 ? { id: ex.id, name: ex.name, kg: kg as number } : null;
    })
    .filter((x): x is { id: string; name: string; kg: number } => x != null);

  if (candidates.length === 0) return null;

  let bestMax = -1;
  for (const c of candidates) {
    if (c.kg > bestMax) bestMax = c.kg;
  }
  const tier = candidates.filter((c) => c.kg === bestMax);
  tier.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const winner = tier[0];

  const cats = bundle.categoryNamesByExercise[winner.id] ?? [];
  const joined = bundle.categoryByExercise[winner.id]?.trim() ?? "";
  const categoryName =
    cats[0]?.trim() ||
    (joined.includes("·") ? joined.split("·")[0]?.trim() ?? "" : joined) ||
    "Training";

  let heaviestKgInCategory = 0;
  for (const ex of bundle.allExercises) {
    const names = bundle.categoryNamesByExercise[ex.id] ?? [];
    const inCat = names.includes(categoryName);
    if (!inCat) continue;
    const kg = loads[ex.id];
    if (Number.isFinite(kg) && kg > heaviestKgInCategory) heaviestKgInCategory = kg;
  }

  if (heaviestKgInCategory <= 0) heaviestKgInCategory = winner.kg;

  return {
    exerciseName: winner.name,
    categoryName,
    heaviestKgInCategory,
  };
}
