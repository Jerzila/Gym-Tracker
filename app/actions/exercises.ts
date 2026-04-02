"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Exercise } from "@/lib/types";
import { normalizeLoadType } from "@/lib/loadType";
import { recalculateExerciseMetricsForLoadTypeChange } from "@/lib/recalculateExerciseMetrics";
import { recalculateUserRankings } from "@/lib/recalculateUserRankings";
import { refreshUserRankingsSafe } from "@/lib/refreshUserRankingsSafe";
import { revalidatePath } from "next/cache";

function isConnectionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("network");
}

export async function getExercises(): Promise<Exercise[]> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: exercises, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    if (error) throw new Error(error.message);

    const exerciseList = (exercises ?? []) as Exercise[];
    if (exerciseList.length === 0) return [];

    const { data: mappings, error: mappingsError } = await supabase
      .from("exercise_categories")
      .select("exercise_id, category_id")
      .in("exercise_id", exerciseList.map((e) => e.id));
    if (mappingsError) throw new Error(mappingsError.message);

    const byExerciseId = new Map(exerciseList.map((e) => [e.id, e]));
    const expanded: Exercise[] = [];
    for (const mapping of mappings ?? []) {
      const ex = byExerciseId.get(mapping.exercise_id);
      if (!ex) continue;
      expanded.push({
        ...ex,
        category_id: mapping.category_id,
      });
    }

    // Fallback for any exercise rows without mapping.
    const mappedIds = new Set(expanded.map((e) => e.id));
    for (const ex of exerciseList) {
      if (!mappedIds.has(ex.id)) expanded.push(ex);
    }

    expanded.sort((a, b) => a.name.localeCompare(b.name));
    return expanded;
  } catch (e) {
    if (isConnectionError(e)) {
      throw new Error("Can't connect to Supabase. Check NEXT_PUBLIC_SUPABASE_URL and your API key in .env.local.");
    }
    throw e;
  }
}

export async function createExercise(formData: FormData): Promise<{ error?: string }> {
  const name = (formData.get("name") as string)?.trim();
  const repMin = Number(formData.get("rep_min"));
  const repMax = Number(formData.get("rep_max"));
  const categoryId = (formData.get("category_id") as string)?.trim();
  const loadType = normalizeLoadType(formData.get("load_type"));

  if (!name || repMin < 1 || repMax < repMin) {
    return { error: "Invalid: name required, rep_min ≥ 1, rep_max ≥ rep_min" };
  }
  if (!categoryId) {
    return { error: "Please select a category." };
  }

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in to create an exercise." };

    const { data: existingRows, error: existingError } = await supabase
      .from("exercises")
      .select("id, name")
      .eq("user_id", user.id)
      .ilike("name", name);
    if (existingError) return { error: existingError.message };

    const existing = (existingRows ?? []).find(
      (row) => row.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      const { error: mapError } = await supabase
        .from("exercise_categories")
        .upsert(
          [{ exercise_id: existing.id, category_id: categoryId }] as Record<string, unknown>[],
          { onConflict: "exercise_id,category_id", ignoreDuplicates: true }
        );
      if (mapError) return { error: mapError.message };
    } else {
      const { data: created, error: createError } = await supabase
        .from("exercises")
        .insert({
          user_id: user.id,
          category_id: categoryId,
          name,
          load_type: loadType,
          rep_min: repMin,
          rep_max: repMax,
        } as Record<string, unknown>)
        .select("id")
        .single();

      if (createError) return { error: createError.message };

      const { error: mapError } = await supabase
        .from("exercise_categories")
        .upsert(
          [{ exercise_id: created.id, category_id: categoryId }] as Record<string, unknown>[],
          { onConflict: "exercise_id,category_id", ignoreDuplicates: true }
        );
      if (mapError) return { error: mapError.message };
    }

    await refreshUserRankingsSafe(user.id);

    revalidatePath("/");
    return {};
  } catch (e) {
    if (isConnectionError(e)) {
      return { error: "Can't connect to Supabase. Check NEXT_PUBLIC_SUPABASE_URL and your API key in .env.local." };
    }
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateExercise(
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  const name = (formData.get("name") as string)?.trim();
  const repMin = Number(formData.get("rep_min"));
  const repMax = Number(formData.get("rep_max"));
  const loadType = normalizeLoadType(formData.get("load_type"));

  if (!name || name.length === 0) return { error: "Name is required" };
  if (Number.isNaN(repMin) || Number.isNaN(repMax) || repMin < 1 || repMax < 1) {
    return { error: "Rep min and rep max must be positive numbers" };
  }
  if (repMin >= repMax) return { error: "Rep min must be less than rep max" };

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: existing, error: existingErr } = await supabase
      .from("exercises")
      .select("load_type")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingErr) return { error: existingErr.message };
    const previousLoadType = normalizeLoadType((existing as { load_type?: unknown } | null)?.load_type);

    const { error } = await supabase
      .from("exercises")
      .update({ name, load_type: loadType, rep_min: repMin, rep_max: repMax } as Record<string, unknown>)
      .eq("id", id);

    if (error) return { error: error.message };

    // Targeted recomputation: only when load_type changes.
    if (previousLoadType !== loadType) {
      await recalculateExerciseMetricsForLoadTypeChange(id, user.id, loadType);
      await recalculateUserRankings(user.id);
    }

    revalidatePath("/");
    revalidatePath(`/exercise/${id}`);
    // Derived dashboards/insights depend on 1RM/PR computations.
    revalidatePath("/account");
    revalidatePath("/insights");
    revalidatePath("/calendar");
    return {};
  } catch (e) {
    if (isConnectionError(e)) {
      return { error: "Can't connect to Supabase. Check NEXT_PUBLIC_SUPABASE_URL and your API key in .env.local." };
    }
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteExercise(id: string): Promise<{ error?: string }> {
  if (!id) return { error: "Missing exercise id" };
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: workouts, error: wError } = await supabase
      .from("workouts")
      .select("id")
      .eq("exercise_id", id);

    if (wError) return { error: wError.message };
    const workoutIds = (workouts ?? []).map((w) => w.id);

    if (workoutIds.length > 0) {
      const { error: setsError } = await supabase
        .from("sets")
        .delete()
        .in("workout_id", workoutIds);
      if (setsError) return { error: setsError.message };

      const { error: delWorkoutsError } = await supabase
        .from("workouts")
        .delete()
        .eq("exercise_id", id);
      if (delWorkoutsError) return { error: delWorkoutsError.message };
    }

    const { error: exError } = await supabase.from("exercises").delete().eq("id", id);
    if (exError) return { error: exError.message };

    await refreshUserRankingsSafe(user.id);

    revalidatePath("/");
    return {};
  } catch (e) {
    if (isConnectionError(e)) {
      return { error: "Can't connect to Supabase. Check NEXT_PUBLIC_SUPABASE_URL and your API key in .env.local." };
    }
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateExerciseNotes(
  id: string,
  notes: string | null
): Promise<{ error?: string }> {
  if (!id) return { error: "Missing exercise id" };
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("exercises")
      .update({ notes: notes?.trim() || null } as Record<string, unknown>)
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/");
    revalidatePath(`/exercise/${id}`);
    return {};
  } catch (e) {
    if (isConnectionError(e)) {
      return { error: "Can't connect to Supabase. Check your .env.local." };
    }
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function getExerciseById(id: string): Promise<{
  exercise:
    | (Exercise & {
        workouts: {
          id: string;
          date: string;
          weight: number;
          estimated_1rm?: number | null;
          average_estimated_1rm?: number | null;
          average_weight?: number | null;
          load_type: Exercise["load_type"];
          sets: { reps: number; weight?: number | null }[];
        }[];
      })
    | null;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: exercise, error: exError } = await supabase
      .from("exercises")
      .select("*")
      .eq("id", id)
      .single();

    if (exError || !exercise) {
      return { exercise: null, error: exError?.message ?? "Not found" };
    }

    // Backwards compatible: if migrations haven't run yet, these new columns may not exist.
    const workoutsQuery = supabase
      .from("workouts")
      .select("id, date, weight, estimated_1rm, average_estimated_1rm, average_weight, created_at")
      .eq("exercise_id", id)
      .order("date", { ascending: false });
    const workoutsFallbackQuery = supabase
      .from("workouts")
      .select("id, date, weight, estimated_1rm, created_at")
      .eq("exercise_id", id)
      .order("date", { ascending: false });

    const { data: workouts, error: wError } = await workoutsQuery;
    const { data: workouts2, error: wError2 } =
      wError && wError.message?.toLowerCase().includes("does not exist")
        ? await workoutsFallbackQuery
        : { data: null as typeof workouts | null, error: null as typeof wError | null };

    const workoutsList = (workouts ?? workouts2 ?? []) as typeof workouts;
    const workoutsErr = wError2 ?? wError;
    if (workoutsErr && workoutsList.length === 0) {
      // Don't 404 the whole exercise page on schema mismatch; render exercise with empty workouts.
      return { exercise: { ...(exercise as Exercise), workouts: [] } };
    }

    const workoutIds = (workoutsList ?? []).map((w) => w.id);
    if (workoutIds.length === 0) {
      return {
        exercise: {
          ...(exercise as Exercise),
          workouts: (workoutsList ?? []).map((w) => ({
            ...w,
            date: w.date,
            weight: w.weight,
            load_type: (exercise as Exercise).load_type,
            sets: [],
          })),
        },
      };
    }

    const setsQuery = supabase
      .from("sets")
      .select("workout_id, reps, weight, id")
      .in("workout_id", workoutIds);
    const setsFallbackQuery = supabase
      .from("sets")
      .select("workout_id, reps, id")
      .in("workout_id", workoutIds);

    const { data: sets, error: sError } = await setsQuery;
    const { data: sets2, error: sError2 } =
      sError && sError.message?.toLowerCase().includes("does not exist")
        ? await setsFallbackQuery
        : { data: null as typeof sets | null, error: null as typeof sError | null };

    const setsList = (sets ?? sets2 ?? []) as typeof sets;
    const setsErr = sError2 ?? sError;
    if (setsErr && setsList.length === 0) {
      return { exercise: { ...(exercise as Exercise), workouts: [] } };
    }

    const setsByWorkout = new Map<string, { id: string; reps: number; weight?: number | null }[]>();
    for (const s of setsList ?? []) {
      const list = setsByWorkout.get(s.workout_id) ?? [];
      list.push({
        id: (s as { id: string }).id,
        reps: s.reps,
        weight: (s as { weight?: number | null }).weight ?? null,
      });
      setsByWorkout.set(s.workout_id, list);
    }

    const workoutsWithSets = (workoutsList ?? []).map((w) => ({
      id: w.id,
      date: w.date,
      weight: w.weight,
      estimated_1rm: (w as { estimated_1rm?: number | null }).estimated_1rm ?? null,
      average_estimated_1rm: (w as { average_estimated_1rm?: number | null }).average_estimated_1rm ?? null,
      average_weight: (w as { average_weight?: number | null }).average_weight ?? null,
      load_type: (exercise as Exercise).load_type,
      sets: setsByWorkout.get(w.id) ?? [],
    }));

    return {
      exercise: {
        ...(exercise as Exercise),
        workouts: workoutsWithSets,
      },
    };
  } catch (e) {
    if (isConnectionError(e)) {
      return { exercise: null, error: "Can't connect to Supabase. Check your .env.local." };
    }
    return { exercise: null, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
