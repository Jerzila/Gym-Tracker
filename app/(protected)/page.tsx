import Link from "next/link";
import { getExercises } from "@/app/actions/exercises";
import { getCategories } from "@/app/actions/categories";
import { getBodyweightStats } from "@/app/actions/bodyweight";
import { CreateExerciseForm } from "@/app/components/CreateExerciseForm";
import { ExerciseListByCategoryAccordion } from "@/app/components/ExerciseListByCategoryAccordion";
import { LogBodyweightForm } from "@/app/components/LogBodyweightForm";
import { ThisWeekSection } from "@/app/components/ThisWeekSection";
import { formatWeight } from "@/lib/formatWeight";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ expand?: string }>;
}) {
  const params = await searchParams;
  const defaultExpandedCategoryIds = params.expand ? [params.expand] : undefined;
  let exercises: Awaited<ReturnType<typeof getExercises>> = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let loadError: string | null = null;
  try {
    [categories, exercises] = await Promise.all([getCategories(), getExercises()]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load exercises";
  }

  let bodyweightStats: Awaited<ReturnType<typeof getBodyweightStats>> = {
    latest: null,
    diffFromPrevious: null,
    avg7Days: null,
    change30Days: null,
  };
  try {
    bodyweightStats = await getBodyweightStats();
  } catch {
    // Bodyweight optional; leave stats default
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <section className="pb-8">
        <div className="space-y-3">
          <LogBodyweightForm />
          {(bodyweightStats.latest || bodyweightStats.diffFromPrevious != null) && (
            <p className="text-sm text-zinc-400">
              {bodyweightStats.latest && (
                <>
                  Latest: {formatWeight(bodyweightStats.latest.weight)}kg
                  {bodyweightStats.diffFromPrevious != null && (
                    <span
                      className={
                        bodyweightStats.diffFromPrevious >= 0
                          ? " text-amber-400/90"
                          : " text-emerald-400/90"
                      }
                    >
                      {" "}
                      ({formatWeight(bodyweightStats.diffFromPrevious, { signed: true })}kg)
                    </span>
                  )}
                </>
              )}
              <Link
                href="/bodyweight"
                className="ml-2 text-zinc-500 transition hover:text-zinc-300"
              >
                History →
              </Link>
            </p>
          )}
          {(bodyweightStats.avg7Days != null || bodyweightStats.change30Days != null) && (
            <div className="flex flex-wrap gap-2">
              {bodyweightStats.avg7Days != null && (
                <span className="text-xs text-zinc-500">
                  7-day avg: {formatWeight(bodyweightStats.avg7Days)}kg
                </span>
              )}
              {bodyweightStats.change30Days != null && (
                <span
                  className={
                    bodyweightStats.change30Days >= 0
                      ? "text-xs text-amber-400/90"
                      : "text-xs text-emerald-400/90"
                  }
                >
                  30-day: {formatWeight(bodyweightStats.change30Days, { signed: true })}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="border-t border-zinc-800/60 pt-8" aria-hidden />

      <section className="pb-8">
        <CreateExerciseForm categories={categories} />
        <ThisWeekSection />
      </section>

      {loadError && (
        <p className="mb-6 rounded-lg bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {loadError}
        </p>
      )}

      <div className="border-t border-zinc-800/60 pt-8" aria-hidden />

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Exercises
        </h2>
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
