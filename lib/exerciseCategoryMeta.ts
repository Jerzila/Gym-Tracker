import type { SupabaseClient } from "@supabase/supabase-js";

/** Batch-resolve category display names for exercises (RLS applies). */
export async function fetchCategoryNameByExerciseId(
  supabase: SupabaseClient,
  exerciseIds: string[],
  userId: string
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (exerciseIds.length === 0) return out;

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, category_id")
    .in("id", exerciseIds);

  const catIds = [...new Set((exercises ?? []).map((e) => e.category_id).filter(Boolean))];
  if (catIds.length === 0) return out;

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId)
    .in("id", catIds);

  const nameByCatId = new Map((categories ?? []).map((c) => [c.id as string, String(c.name)]));

  for (const e of exercises ?? []) {
    const id = e.id as string;
    const n = nameByCatId.get(e.category_id as string);
    if (n != null) out.set(id, n);
  }

  return out;
}

/**
 * All category display names per exercise: primary `exercises.category_id` plus any
 * `exercise_categories` rows (stable order: primary first, then mappings).
 */
export async function fetchCategoryNamesByExerciseId(
  supabase: SupabaseClient,
  exerciseIds: string[],
  userId: string
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (exerciseIds.length === 0) return out;

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, category_id")
    .in("id", exerciseIds);

  const { data: mappings } = await supabase
    .from("exercise_categories")
    .select("exercise_id, category_id")
    .in("exercise_id", exerciseIds);

  const catIds = [
    ...new Set(
      [
        ...(exercises ?? []).map((e) => e.category_id as string),
        ...(mappings ?? []).map((m) => m.category_id as string),
      ].filter(Boolean)
    ),
  ];

  if (catIds.length === 0) return out;

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId)
    .in("id", catIds);

  const nameByCatId = new Map((categories ?? []).map((c) => [c.id as string, String(c.name).trim()]));

  const push = (exId: string, catId: string | null | undefined) => {
    if (!catId) return;
    const n = nameByCatId.get(catId);
    if (!n) return;
    const list = out.get(exId) ?? [];
    if (!list.includes(n)) list.push(n);
    out.set(exId, list);
  };

  for (const e of exercises ?? []) {
    push(e.id as string, e.category_id as string);
  }
  for (const m of mappings ?? []) {
    push(m.exercise_id as string, m.category_id as string);
  }

  return out;
}
