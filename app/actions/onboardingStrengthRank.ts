"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getEffectiveWeight, normalizeLoadType } from "@/lib/loadType";
import { epley1RM } from "@/lib/progression";

function isConnectionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("fetch failed") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("network")
  );
}

const DEFAULT_CATEGORY_NAMES = [
  "Chest",
  "Back",
  "Biceps",
  "Triceps",
  "Shoulders",
  "Forearms",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Core",
];

async function ensureDefaultCategories(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string
): Promise<void> {
  await supabase
    .from("categories")
    .upsert(
      DEFAULT_CATEGORY_NAMES.map((name) => ({ user_id: userId, name })),
      { onConflict: "user_id,name", ignoreDuplicates: true }
    );
}

function mapStrengthCategoryToCategoryName(category: "chest" | "back" | "shoulders" | "arms" | "legs"): string {
  if (category === "legs") return "Quads";
  if (category === "arms") return "Biceps";
  if (category === "chest") return "Chest";
  if (category === "back") return "Back";
  return "Shoulders";
}

export async function logOnboardingStrengthLift(args: {
  category: "chest" | "back" | "shoulders" | "arms" | "legs";
  exerciseName: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  reps: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    if (!args.exerciseName.trim()) return { ok: false, error: "Missing exercise name" };
    if (!Number.isFinite(args.weightKg) || args.weightKg <= 0) return { ok: false, error: "Invalid weight" };
    if (!Number.isFinite(args.reps) || args.reps <= 0) return { ok: false, error: "Invalid reps" };

    await ensureDefaultCategories(supabase, user.id);

    const categoryName = mapStrengthCategoryToCategoryName(args.category);
    const { data: categories, error: catErr } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", user.id)
      .ilike("name", categoryName);
    if (catErr) return { ok: false, error: catErr.message };
    const categoryId = categories?.[0]?.id as string | undefined;
    if (!categoryId) return { ok: false, error: `Missing category "${categoryName}"` };

    const { data: existingRows, error: exFindErr } = await supabase
      .from("exercises")
      .select("id, name, load_type")
      .eq("user_id", user.id)
      .ilike("name", args.exerciseName.trim());
    if (exFindErr) return { ok: false, error: exFindErr.message };

    const existing = (existingRows ?? []).find(
      (row) => String(row.name ?? "").trim().toLowerCase() === args.exerciseName.trim().toLowerCase()
    ) as { id: string; load_type?: unknown } | undefined;

    const loadType = normalizeLoadType(existing?.load_type);

    let exerciseId = existing?.id;
    if (!exerciseId) {
      const { data: created, error: createErr } = await supabase
        .from("exercises")
        .insert({
          user_id: user.id,
          category_id: categoryId,
          name: args.exerciseName.trim(),
          load_type: loadType,
          rep_min: 1,
          rep_max: 12,
        } as Record<string, unknown>)
        .select("id")
        .single();
      if (createErr) return { ok: false, error: createErr.message };
      exerciseId = created?.id as string | undefined;
    }

    if (!exerciseId) return { ok: false, error: "Could not create exercise" };

    const { error: mapErr } = await supabase
      .from("exercise_categories")
      .upsert([{ exercise_id: exerciseId, category_id: categoryId }] as Record<string, unknown>[], {
        onConflict: "exercise_id,category_id",
        ignoreDuplicates: true,
      });
    if (mapErr) return { ok: false, error: mapErr.message };

    const { data: workout, error: wErr } = await supabase
      .from("workouts")
      .insert({
        user_id: user.id,
        exercise_id: exerciseId,
        date: args.date,
        weight: args.weightKg,
        effective_weight: getEffectiveWeight(args.weightKg, loadType),
        estimated_1rm: epley1RM(getEffectiveWeight(args.weightKg, loadType), args.reps),
      } as Record<string, unknown>)
      .select("id")
      .single();
    if (wErr) return { ok: false, error: wErr.message };
    const workoutId = workout?.id as string | undefined;
    if (!workoutId) return { ok: false, error: "Failed to create workout" };

    const { error: sErr } = await supabase
      .from("sets")
      .insert([{ workout_id: workoutId, reps: args.reps }] as Record<string, unknown>[]);
    if (sErr) return { ok: false, error: sErr.message };
    return { ok: true };
  } catch (e) {
    if (isConnectionError(e)) return { ok: false, error: "Can't connect to Supabase. Check your .env.local." };
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

