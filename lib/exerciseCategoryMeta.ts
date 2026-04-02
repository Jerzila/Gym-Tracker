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
