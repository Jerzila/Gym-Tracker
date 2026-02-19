import Link from "next/link";
import { getExercises } from "@/app/actions/exercises";
import { getBodyweightStats } from "@/app/actions/bodyweight";
import { CreateExerciseForm } from "@/app/components/CreateExerciseForm";
import { ExerciseCard } from "@/app/components/ExerciseCard";
import { LogBodyweightForm } from "@/app/components/LogBodyweightForm";

export default async function DashboardPage() {
  let exercises: Awaited<ReturnType<typeof getExercises>> = [];
  let loadError: string | null = null;
  try {
    exercises = await getExercises();
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-4 py-4 sm:px-6">
        <h1 className="text-xl font-semibold tracking-tight">Gym Tracker</h1>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6 sm:px-6">
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
            Log bodyweight
          </h2>
          <LogBodyweightForm />
          {(bodyweightStats.latest || bodyweightStats.diffFromPrevious != null) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {bodyweightStats.latest && (
                <span className="font-medium">
                  Latest: {bodyweightStats.latest.weight} kg
                  <span className="ml-1 text-zinc-500">({bodyweightStats.latest.date})</span>
                </span>
              )}
              {bodyweightStats.diffFromPrevious != null && (
                <span
                  className={
                    bodyweightStats.diffFromPrevious >= 0
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }
                >
                  {bodyweightStats.diffFromPrevious >= 0 ? "+" : ""}
                  {bodyweightStats.diffFromPrevious} kg vs previous
                </span>
              )}
              <Link
                href="/bodyweight"
                className="text-zinc-500 transition hover:text-zinc-300"
              >
                History →
              </Link>
            </div>
          )}
          {(bodyweightStats.avg7Days != null || bodyweightStats.change30Days != null) && (
            <div className="mt-2 flex flex-wrap gap-3">
              {bodyweightStats.avg7Days != null && (
                <span className="rounded-md bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-400">
                  7-day avg: {bodyweightStats.avg7Days} kg
                </span>
              )}
              {bodyweightStats.change30Days != null && (
                <span
                  className={
                    bodyweightStats.change30Days >= 0
                      ? "rounded-md bg-amber-500/10 px-2.5 py-1 text-xs text-amber-400"
                      : "rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400"
                  }
                >
                  30-day: {bodyweightStats.change30Days >= 0 ? "+" : ""}
                  {bodyweightStats.change30Days} kg
                </span>
              )}
            </div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
            New exercise
          </h2>
          <CreateExerciseForm />
        </section>

        {loadError && (
          <p className="mb-4 rounded-lg bg-red-950/50 px-4 py-3 text-red-300">
            {loadError}
          </p>
        )}

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
            Exercises
          </h2>
          {exercises.length === 0 ? (
            <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-center text-zinc-500">
              No exercises yet. Add one above.
            </p>
          ) : (
            <ul className="space-y-2">
              {exercises.map((ex) => (
                <ExerciseCard key={ex.id} exercise={ex} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
