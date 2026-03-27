"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getEffectiveWeight, normalizeLoadType } from "@/lib/loadType";
import { epley1RM } from "@/lib/progression";
import {
  categoryToStrengthMuscles,
  computeStrengthRanking,
  type ExerciseDataPoint,
} from "@/lib/strengthRanking";

export async function recalculateUserRankings(userId: string): Promise<void> {
  const supabase = await createServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("body_weight")
    .eq("id", userId)
    .maybeSingle();

  const bodyweightKg = Number(profile?.body_weight) || 0;

  const { data: workouts, error: workoutsErr } = await supabase
    .from("workouts")
    .select("id, exercise_id, date, weight")
    .eq("user_id", userId);
  if (workoutsErr) throw new Error(workoutsErr.message);
  if (!workouts?.length) {
    const empty = computeStrengthRanking({ exerciseDataPoints: [], bodyweightKg });
    const { error: upsertErr } = await supabase.from("rankings").upsert(
      {
        user_id: userId,
        overall_score: empty.overallScore,
        overall_rank: empty.overallRank,
        overall_rank_label: empty.overallRankLabel,
        overall_rank_slug: empty.overallRankSlug,
        overall_tier: empty.overallTier,
        overall_progress_to_next_pct: empty.overallProgressToNextPct,
        overall_next_rank_label: empty.overallNextRankLabel,
        overall_top_percentile_label: empty.overallTopPercentileLabel,
        muscle_scores: empty.muscleScores,
        muscle_ranks: empty.muscleRanks,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>,
      { onConflict: "user_id" }
    );
    if (upsertErr) throw new Error(upsertErr.message);
    return;
  }

  const workoutIds = workouts.map((w) => w.id as string);
  const exerciseIds = [...new Set(workouts.map((w) => w.exercise_id as string))];

  const { data: sets, error: setsErr } = await supabase
    .from("sets")
    .select("workout_id, reps")
    .in("workout_id", workoutIds);
  if (setsErr) throw new Error(setsErr.message);

  const { data: exercises, error: exercisesErr } = await supabase
    .from("exercises")
    .select("id, name, category_id, load_type")
    .in("id", exerciseIds);
  if (exercisesErr) throw new Error(exercisesErr.message);

  const categoryIds = [...new Set((exercises ?? []).map((e) => e.category_id as string))];
  const { data: categories, error: categoriesErr } = await supabase
    .from("categories")
    .select("id, name")
    .in("id", categoryIds);
  if (categoriesErr) throw new Error(categoriesErr.message);

  const setsByWorkout = new Map<string, number[]>();
  for (const s of sets ?? []) {
    const list = setsByWorkout.get(s.workout_id as string) ?? [];
    list.push(Number(s.reps) || 0);
    setsByWorkout.set(s.workout_id as string, list);
  }

  const exerciseById = new Map(
    (exercises ?? []).map((e) => [
      e.id as string,
      {
        name: e.name as string,
        categoryId: e.category_id as string,
        loadType: normalizeLoadType((e as { load_type?: unknown }).load_type),
      },
    ])
  );
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id as string, c.name as string]));

  const points: ExerciseDataPoint[] = [];
  for (const w of workouts) {
    const ex = exerciseById.get(w.exercise_id as string);
    if (!ex) continue;
    const categoryName = categoryNameById.get(ex.categoryId) ?? "";
    const muscles = categoryToStrengthMuscles(categoryName);
    if (!muscles.length) continue;
    const repsList = setsByWorkout.get(w.id as string) ?? [];
    if (!repsList.length) continue;

    const effectiveWeight = getEffectiveWeight(Number(w.weight) || 0, ex.loadType);
    for (const reps of repsList) {
      if (reps <= 0) continue;
      const ranking1RM = epley1RM(effectiveWeight, reps);
      const ratio = bodyweightKg > 0 ? ranking1RM / bodyweightKg : 0;
      for (const muscle of muscles) {
        points.push({
          exerciseId: w.exercise_id as string,
          exerciseName: ex.name,
          categoryName,
          forMuscle: muscle,
          estimated1RM: ranking1RM,
          strengthRatio: ratio,
          date: String(w.date),
        });
      }
    }
  }

  const result = computeStrengthRanking({
    exerciseDataPoints: points,
    bodyweightKg,
  });

  const { error: rankingsErr } = await supabase.from("rankings").upsert(
    {
      user_id: userId,
      overall_score: result.overallScore,
      overall_rank: result.overallRank,
      overall_rank_label: result.overallRankLabel,
      overall_rank_slug: result.overallRankSlug,
      overall_tier: result.overallTier,
      overall_progress_to_next_pct: result.overallProgressToNextPct,
      overall_next_rank_label: result.overallNextRankLabel,
      overall_top_percentile_label: result.overallTopPercentileLabel,
      muscle_scores: result.muscleScores,
      muscle_ranks: result.muscleRanks,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>,
    { onConflict: "user_id" }
  );
  if (rankingsErr) throw new Error(rankingsErr.message);
}

