"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getProgressiveOverloadMessage } from "@/lib/progression";
import { revalidatePath } from "next/cache";

type CreateResult = { message?: string; error?: string };

function isConnectionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("network");
}

export async function createWorkout(
  exerciseId: string,
  formData: FormData
): Promise<CreateResult> {
  const date = (formData.get("date") as string)?.trim() || new Date().toISOString().slice(0, 10);
  const weight = Number(formData.get("weight"));
  const rep1 = Number(formData.get("reps_1"));
  const rep2 = Number(formData.get("reps_2"));
  const rep3 = Number(formData.get("reps_3"));
  const rep4 = formData.get("reps_4") ? Number(formData.get("reps_4")) : null;
  const rep5 = formData.get("reps_5") ? Number(formData.get("reps_5")) : null;

  const reps = [rep1, rep2, rep3].filter((r) => !Number.isNaN(r) && r >= 0);
  if (rep4 !== null && !Number.isNaN(rep4) && rep4 >= 0) reps.push(rep4);
  if (rep5 !== null && !Number.isNaN(rep5) && rep5 >= 0) reps.push(rep5);

  if (reps.length < 3 || weight <= 0) {
    return { error: "Need at least 3 sets with valid reps and weight > 0" };
  }

  try {
    const supabase = createServerClient();

    const { data: exercise, error: exError } = await supabase
    .from("exercises")
    .select("rep_min, rep_max")
    .eq("id", exerciseId)
    .single();

  if (exError || !exercise) {
    return { error: "Exercise not found" };
  }

  const { data: workout, error: wError } = await supabase
    .from("workouts")
    .insert({ exercise_id: exerciseId, date, weight } as Record<string, unknown>)
    .select("id")
    .single();

  if (wError) return { error: wError.message };
  if (!workout) return { error: "Failed to create workout" };

  const { error: sError } = await supabase
    .from("sets")
    .insert(
      reps.map((reps_count) => ({ workout_id: workout.id, reps: reps_count })) as Record<string, unknown>[]
    );

  if (sError) return { error: sError.message };

  const message = getProgressiveOverloadMessage(
    exercise.rep_min,
    exercise.rep_max,
    reps
  );

  revalidatePath("/");
  revalidatePath(`/exercise/${exerciseId}`);
  return { message };
  } catch (e) {
    if (isConnectionError(e)) {
      return { error: "Can't connect to Supabase. Check your .env.local." };
    }
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteWorkout(
  workoutId: string,
  exerciseId: string
): Promise<{ error?: string }> {
  if (!workoutId || !exerciseId) return { error: "Missing workout or exercise id" };
  try {
    const supabase = createServerClient();

    const { error: setsError } = await supabase
      .from("sets")
      .delete()
      .eq("workout_id", workoutId);

    if (setsError) return { error: setsError.message };

    const { error: workoutError } = await supabase
      .from("workouts")
      .delete()
      .eq("id", workoutId);

    if (workoutError) return { error: workoutError.message };

    revalidatePath("/");
    revalidatePath(`/exercise/${exerciseId}`);
    return {};
  } catch (e) {
    if (isConnectionError(e)) {
      return { error: "Can't connect to Supabase. Check your .env.local." };
    }
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
