import Link from "next/link";
import { getExercises } from "@/app/actions/exercises";
import { getCategories } from "@/app/actions/categories";
import { CreateExerciseForm } from "@/app/components/CreateExerciseForm";
import { ExerciseListByCategoryAccordion } from "@/app/components/ExerciseListByCategoryAccordion";
import { ThisWeekSection } from "@/app/components/ThisWeekSection";
import { RestoreExercisesScroll } from "@/app/components/RestoreExercisesScroll";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ expand?: string; log?: string }>;
}) {
  const params = await searchParams;
  const logIntent = params.log === "1";

  let exercises: Awaited<ReturnType<typeof getExercises>> = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let loadError: string | null = null;
  try {
    [categories, exercises] = await Promise.all([getCategories(), getExercises()]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load exercises";
  }

  const categoryIdsWithExercises = [
    ...new Set(exercises.map((e) => e.category_id)),
  ];
  const defaultExpandedCategoryIds = logIntent
    ? categoryIdsWithExercises
    : params.expand
      ? [params.expand]
      : undefined;

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6 sm:px-6">
      <RestoreExercisesScroll />
      <section className="pb-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Exercises
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <CreateExerciseForm categories={categories} buttonLabel="+ Add Exercise" />
          <Link
            href="/categories"
            prefetch={true}
            className="inline-flex items-center justify-center rounded-lg border-[1.5px] border-[#ff9800] bg-transparent px-[14px] py-2 text-sm font-medium text-[#ff9800] outline-none transition-colors hover:bg-[rgba(255,152,0,0.1)] focus-visible:ring-2 focus-visible:ring-[#ff9800]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 active:scale-[0.98]"
          >
            Manage Categories
          </Link>
        </div>
        <ThisWeekSection />
      </section>

      {loadError && (
        <p className="mb-6 rounded-lg bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {loadError}
        </p>
      )}

      <div className="border-t border-zinc-800/60 pt-6" aria-hidden />

      <section id="exercise-list" className="scroll-mt-4 pt-6">
        <p className="mb-4 text-sm text-zinc-400">
          Tap an exercise to view details, charts, and log sets.
        </p>
        {exercises.length === 0 ? (
          <p className="rounded-xl bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
            No exercises yet. Add one above.
          </p>
        ) : (
          <ExerciseListByCategoryAccordion
            exercises={exercises}
            categories={categories}
            defaultExpandedCategoryIds={defaultExpandedCategoryIds}
          />
        )}
      </section>
    </main>
  );
}
