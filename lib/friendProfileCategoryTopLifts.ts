import type { StrengthRankingComputeBundle } from "@/lib/computeStrengthRankingForUser";
import type { WeightUnits } from "@/lib/formatWeight";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { formatDurationClock } from "@/lib/formatDuration";

export type FriendCategoryTopLiftRow = {
  categoryName: string;
  exerciseName: string;
  estimated1RM: number;
  isDurationSeconds: boolean;
  isReps: boolean;
};

type ExerciseAgg = {
  exerciseName: string;
  /** Value shown in UI: kg est. 1RM, hold seconds, or rep count */
  displayValue: number;
  isDurationSeconds: boolean;
  isReps: boolean;
  /** Ordering key within a category (not comparable across modalities) */
  compare: number;
};

function upsertExerciseBest(map: Map<string, ExerciseAgg>, exerciseId: string, next: ExerciseAgg) {
  const prev = map.get(exerciseId);
  if (!prev || next.compare > prev.compare) map.set(exerciseId, next);
}

type CategoryBest = { row: FriendCategoryTopLiftRow; compare: number };

/**
 * Best logged lift per user-defined exercise category, using the same workout-derived
 * bundle as strength rankings (Insights).
 */
export function buildFriendTopLiftsByCategoryFromBundle(
  bundle: StrengthRankingComputeBundle
): FriendCategoryTopLiftRow[] {
  const byExercise = new Map<string, ExerciseAgg>();

  for (const dp of bundle.exerciseDataPoints) {
    const est = Number(dp.estimated1RM);
    if (!Number.isFinite(est) || est <= 0) continue;
    const isDurationSeconds = Boolean(dp.isDurationSeconds);
    upsertExerciseBest(byExercise, dp.exerciseId, {
      exerciseName: dp.exerciseName,
      displayValue: est,
      isDurationSeconds,
      isReps: false,
      compare: est,
    });
  }

  for (const c of bundle.coreTopExercisesForDisplay) {
    const id = c.exerciseId;
    const score = Number(c.score);
    if (!Number.isFinite(score) || score <= 0) continue;
    const displayValue = Number(c.displayEstimated1RM);
    if (!Number.isFinite(displayValue) || displayValue <= 0) continue;
    upsertExerciseBest(byExercise, id, {
      exerciseName: c.name,
      displayValue,
      isDurationSeconds: c.isDurationSeconds,
      isReps: c.isReps,
      compare: score,
    });
  }

  const bestByCategory = new Map<string, CategoryBest>();

  for (const ex of bundle.allExercises) {
    const agg = byExercise.get(ex.id);
    if (!agg) continue;
    const cats = bundle.categoryNamesByExercise[ex.id] ?? [];
    const seen = new Set<string>();
    for (const raw of cats) {
      const categoryName = String(raw ?? "").trim();
      if (!categoryName || seen.has(categoryName)) continue;
      seen.add(categoryName);
      const prev = bestByCategory.get(categoryName);
      if (!prev || agg.compare > prev.compare) {
        bestByCategory.set(categoryName, {
          compare: agg.compare,
          row: {
            categoryName,
            exerciseName: agg.exerciseName,
            estimated1RM: agg.displayValue,
            isDurationSeconds: agg.isDurationSeconds,
            isReps: agg.isReps,
          },
        });
      }
    }
  }

  return [...bestByCategory.values()]
    .map((x) => x.row)
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName, undefined, { sensitivity: "base" }));
}

export function formatFriendCategoryLiftSummary(
  row: Pick<FriendCategoryTopLiftRow, "estimated1RM" | "isDurationSeconds" | "isReps">,
  units: WeightUnits
): string {
  if (row.isDurationSeconds) return formatDurationClock(row.estimated1RM);
  if (row.isReps) return `${Math.round(row.estimated1RM)} reps`;
  const w = weightUnitLabel(units);
  return `${formatWeight(row.estimated1RM, { units })} ${w} est. 1RM`;
}
