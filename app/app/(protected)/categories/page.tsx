import { getCategories } from "@/app/actions/categories";
import { getExercises } from "@/app/actions/exercises";
import { ManageCategoriesClient } from "@/app/components/ManageCategoriesClient";

export default async function ManageCategoriesPage() {
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let exercises: Awaited<ReturnType<typeof getExercises>> = [];
  try {
    [categories, exercises] = await Promise.all([getCategories(), getExercises()]);
  } catch {
    // show empty state
  }
  const exerciseCountByCategoryId = new Map<string, number>();
  for (const ex of exercises) {
    exerciseCountByCategoryId.set(
      ex.category_id,
      (exerciseCountByCategoryId.get(ex.category_id) ?? 0) + 1
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight">Manage Categories</h2>
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Add custom muscle groups or rename/delete existing ones. You can only delete a category if no exercises use it.
      </p>
      <ManageCategoriesClient
        categories={categories}
        exerciseCountByCategoryId={Object.fromEntries(exerciseCountByCategoryId)}
      />
    </main>
  );
}
