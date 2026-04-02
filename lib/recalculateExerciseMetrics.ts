"use server";

import { createServerClient } from "@/lib/supabase/server";
import { loadBodyweightSeriesForUser, resolveBodyweightKgFromLogs } from "@/lib/bodyweightAsOf";
import { fetchCategoryNameByExerciseId } from "@/lib/exerciseCategoryMeta";
import { getEffectiveWeight, normalizeLoadType, type LoadType } from "@/lib/loadType";
import {
  bodyweightStrengthSessionContext,
  sessionEstimated1RMFromSets,
  type SessionSetRow,
} from "@/lib/sessionStrength";

type RecalcResult = { updatedWorkouts: number; updatedPrRow: boolean };

/**
 * Targeted recomputation for a single exercise:
 * - updates workouts.effective_weight and workouts.estimated_1rm for workouts linked to that exercise
 * - upserts exercise_prs aggregate row for that (user, exercise)
 */
export async function recalculateExerciseMetricsForLoadTypeChange(
  exerciseId: string,
  userId: string,
  loadType: LoadType
): Promise<RecalcResult> {
  const supabase = await createServerClient();

  const { data: workouts, error: wErr } = await supabase
    .from("workouts")
    .select("id, weight, date")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId);

  if (wErr) throw new Error(wErr.message);
  if (!workouts?.length) {
    // Keep PR row sync best-effort; do not block load_type updates if RLS/policies are incomplete.
    const { error: prErr } = await supabase.from("exercise_prs").upsert(
      {
        user_id: userId,
        exercise_id: exerciseId,
        heaviest_logged_weight: 0,
        best_estimated_1rm: 0,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>,
      { onConflict: "user_id,exercise_id" }
    );
    if (prErr) {
      console.warn("[recalc] exercise_prs upsert skipped:", prErr.message);
      return { updatedWorkouts: 0, updatedPrRow: false };
    }
    return { updatedWorkouts: 0, updatedPrRow: true };
  }

  const workoutIds = workouts.map((w) => w.id as string);
  const { data: sets, error: sErr } = await supabase
    .from("sets")
    .select("workout_id, reps, weight")
    .in("workout_id", workoutIds);
  if (sErr) throw new Error(sErr.message);

  const setsByWorkout = new Map<string, SessionSetRow[]>();
  for (const s of sets ?? []) {
    const wid = s.workout_id as string;
    const list = setsByWorkout.get(wid) ?? [];
    list.push({
      reps: Number(s.reps) || 0,
      weight: (s as { weight?: number | null }).weight ?? null,
    });
    setsByWorkout.set(wid, list);
  }

  const normalizedLoadType = normalizeLoadType(loadType);
  const { profileKg, logsAsc } = await loadBodyweightSeriesForUser(supabase, userId);
  const categoryNameByExerciseId =
    normalizedLoadType === "bodyweight"
      ? await fetchCategoryNameByExerciseId(supabase, [exerciseId], userId)
      : new Map<string, string>();
  let heaviestLogged = 0;
  let bestEstimated = 0;

  const payload = workouts.map((w) => {
    const id = w.id as string;
    const loggedWeight = Number(w.weight) || 0;
    const list = setsByWorkout.get(id) ?? [];
    const effectiveWeight = getEffectiveWeight(loggedWeight, normalizedLoadType);
    const bwAt =
      normalizedLoadType === "bodyweight"
        ? resolveBodyweightKgFromLogs(String((w as { date?: string }).date ?? ""), logsAsc, profileKg)
        : 0;
    const est = sessionEstimated1RMFromSets(
      list,
      loggedWeight,
      normalizedLoadType,
      normalizedLoadType === "bodyweight"
        ? bodyweightStrengthSessionContext(bwAt, categoryNameByExerciseId.get(exerciseId))
        : undefined
    );
    heaviestLogged = Math.max(heaviestLogged, loggedWeight);
    bestEstimated = Math.max(bestEstimated, est);
    return {
      id,
      effective_weight: effectiveWeight,
      estimated_1rm: est,
    };
  });

  // Use per-row UPDATE (not upsert) so we only require UPDATE RLS, not INSERT RLS.
  let updatedWorkouts = 0;
  for (const row of payload) {
    const { error: upErr } = await supabase
      .from("workouts")
      .update({
        effective_weight: row.effective_weight,
        estimated_1rm: row.estimated_1rm,
      } as Record<string, unknown>)
      .eq("id", row.id)
      .eq("user_id", userId);
    if (upErr) {
      throw new Error(upErr.message);
    }
    updatedWorkouts += 1;
  }

  const { error: prErr } = await supabase.from("exercise_prs").upsert(
    {
      user_id: userId,
      exercise_id: exerciseId,
      heaviest_logged_weight: heaviestLogged,
      best_estimated_1rm: bestEstimated,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>,
    { onConflict: "user_id,exercise_id" }
  );
  if (prErr) {
    console.warn("[recalc] exercise_prs upsert skipped:", prErr.message);
    return { updatedWorkouts, updatedPrRow: false };
  }

  return { updatedWorkouts, updatedPrRow: true };
}

