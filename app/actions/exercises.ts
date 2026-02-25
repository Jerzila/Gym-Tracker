"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Exercise } from "@/lib/types";
import { revalidatePath } from "next/cache";

function isConnectionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("network");
}

export async function getExercises(): Promise<Exercise[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as Exercise[];
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

    const { error } = await supabase
      .from("exercises")
      .insert({ user_id: user.id, category_id: categoryId, name, rep_min: repMin, rep_max: repMax } as Record<string, unknown>);

    if (error) return { error: error.message };
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
  const categoryId = (formData.get("category_id") as string)?.trim();

  if (!name || name.length === 0) return { error: "Name is required" };
  if (!categoryId) return { error: "Please select a category." };
  if (Number.isNaN(repMin) || Number.isNaN(repMax) || repMin < 1 || repMax < 1) {
    return { error: "Rep min and rep max must be positive numbers" };
  }
  if (repMin >= repMax) return { error: "Rep min must be less than rep max" };

  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("exercises")
      .update({ name, category_id: categoryId, rep_min: repMin, rep_max: repMax } as Record<string, unknown>)
      .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/");
    revalidatePath(`/exercise/${id}`);
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

    revalidatePath("/");
    return {};
  } catch (e) {
    if (isConnectionError(e)) {
      return { error: "Can't connect to Supabase. Check NEXT_PUBLIC_SUPABASE_URL and your API key in .env.local." };
    }
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function getExerciseById(id: string): Promise<{
  exercise: (Exercise & { workouts: { id: string; date: string; weight: number; sets: { reps: number }[] }[] }) | null;
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

  const { data: workouts, error: wError } = await supabase
    .from("workouts")
    .select("id, date, weight, created_at")
    .eq("exercise_id", id)
    .order("date", { ascending: false });

  if (wError) return { exercise: null, error: wError.message };

  const workoutIds = (workouts ?? []).map((w) => w.id);
  if (workoutIds.length === 0) {
    return {
      exercise: {
        ...(exercise as Exercise),
        workouts: (workouts ?? []).map((w) => ({ ...w, date: w.date, sets: [] })),
      },
    };
  }

  const { data: sets, error: sError } = await supabase
    .from("sets")
    .select("workout_id, reps, id")
    .in("workout_id", workoutIds);

  if (sError) return { exercise: null, error: sError.message };

  const setsByWorkout = new Map<string, { id: string; reps: number }[]>();
  for (const s of sets ?? []) {
    const list = setsByWorkout.get(s.workout_id) ?? [];
    list.push({ id: (s as { id: string }).id, reps: s.reps });
    setsByWorkout.set(s.workout_id, list);
  }

  const workoutsWithSets = (workouts ?? []).map((w) => ({
    id: w.id,
    date: w.date,
    weight: w.weight,
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
