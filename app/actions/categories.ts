"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { revalidatePath } from "next/cache";

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

function isConnectionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("network");
}

/** Get current user's categories. Ensures all default categories (including Forearms) exist. */
export async function getCategories(): Promise<Category[]> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) throw new Error(error.message);

    const list = (data ?? []) as Category[];
    const existing = new Set(list.map((c) => c.name.toLowerCase()));
    const hasAllDefaults = DEFAULT_CATEGORY_NAMES.every((name) =>
      existing.has(name.toLowerCase())
    );
    if (hasAllDefaults) return list;

    await ensureDefaultCategories(supabase, user.id);
    const { data: refreshed, error: refreshedError } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    if (refreshedError) throw new Error(refreshedError.message);
    return (refreshed ?? []) as Category[];
  } catch (e) {
    if (isConnectionError(e)) {
      throw new Error("Can't connect to Supabase. Check NEXT_PUBLIC_SUPABASE_URL and your API key in .env.local.");
    }
    throw e;
  }
}

/** Ensure default categories for a user (idempotent). */
async function ensureDefaultCategories(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string
): Promise<void> {
  const rows = DEFAULT_CATEGORY_NAMES.map((name) => ({ user_id: userId, name }));
  await supabase
    .from("categories")
    .upsert(rows, { onConflict: "user_id,name", ignoreDuplicates: true });
}

export async function createCategory(formData: FormData): Promise<{ error?: string }> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Category name is required." };

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in." };

    const { error } = await supabase.from("categories").insert({ user_id: user.id, name });
    if (error) {
      if (error.code === "23505") return { error: "A category with this name already exists." };
      return { error: error.message };
    }
    revalidatePath("/");
    revalidatePath("/categories");
    return {};
  } catch (e) {
    if (isConnectionError(e)) {
      return { error: "Can't connect to Supabase." };
    }
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateCategory(
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Category name is required." };
  if (!id) return { error: "Missing category id." };

  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("categories")
      .update({ name })
      .eq("id", id);

    if (error) {
      if (error.code === "23505") return { error: "A category with this name already exists." };
      return { error: error.message };
    }
    revalidatePath("/");
    revalidatePath("/categories");
    return {};
  } catch (e) {
    if (isConnectionError(e)) {
      return { error: "Can't connect to Supabase." };
    }
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  if (!id) return { error: "Missing category id." };

  try {
    const supabase = await createServerClient();
    const { data: exercises } = await supabase
      .from("exercise_categories")
      .select("exercise_id")
      .eq("category_id", id)
      .limit(1);

    if (exercises && exercises.length > 0) {
      return { error: "Cannot delete: category has exercises. Reassign or delete them first." };
    }

    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/");
    revalidatePath("/categories");
    return {};
  } catch (e) {
    if (isConnectionError(e)) {
      return { error: "Can't connect to Supabase." };
    }
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
