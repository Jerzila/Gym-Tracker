import { notFound } from "next/navigation";
import Link from "next/link";
import { getExerciseById } from "@/app/actions/exercises";
import { getHeaviestWeight, getBestEstimated1RM, getMaxRepsAtWeight } from "@/lib/pr";
import { epley1RM } from "@/lib/progression";
import { LogWorkoutForm } from "@/app/components/LogWorkoutForm";
import { WeightChart } from "@/app/components/WeightChart";
import { Estimated1RMChart } from "@/app/components/Estimated1RMChart";
import { WorkoutHistory } from "@/app/components/WorkoutHistory";

type Props = { params: Promise<{ id: string }> };

export default async function ExercisePage({ params }: Props) {
  const { id } = await params;
  const { exercise, error } = await getExerciseById(id);

  if (error || !exercise) notFound();

  const workouts = exercise.workouts ?? [];
  const heaviest = getHeaviestWeight(workouts);
  const best1RM = getBestEstimated1RM(workouts);
  const maxRepsAtHeaviest =
    heaviest != null ? getMaxRepsAtWeight(workouts, heaviest) : null;

  const chartData = workouts
    .slice()
    .reverse()
    .map((w) => {
      const weight = Number(w.weight);
      const bestSet = w.sets.length
        ? w.sets.reduce((best, s) => (s.reps > (best?.reps ?? 0) ? s : best), w.sets[0])
        : null;
      const est1RM = bestSet ? epley1RM(weight, bestSet.reps) : null;
      return {
        date: w.date,
        weight,
        estimated1RM: est1RM,
      };
    });

  return (
    <>
      <div className="border-b border-zinc-800 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-zinc-500 transition hover:text-zinc-300"
            aria-label="Back to dashboard"
          >
            ←
          </Link>
          <h2 className="text-lg font-semibold tracking-tight">{exercise.name}</h2>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Target: {exercise.rep_min}–{exercise.rep_max} reps
        </p>
      </div>

      <main className="mx-auto max-w-xl px-4 py-6 sm:px-6">
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
            Log workout
          </h2>
          <LogWorkoutForm exerciseId={id} repMin={exercise.rep_min} repMax={exercise.rep_max} />
        </section>

        {(heaviest != null || best1RM != null) && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
              PRs
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {heaviest != null && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                  <p className="text-xs text-zinc-500">Heaviest weight</p>
                  <p className="text-lg font-semibold">{heaviest} kg</p>
                </div>
              )}
              {maxRepsAtHeaviest != null && heaviest != null && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                  <p className="text-xs text-zinc-500">Best at {heaviest} kg</p>
                  <p className="text-lg font-semibold">{maxRepsAtHeaviest} reps</p>
                </div>
              )}
              {best1RM != null && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                  <p className="text-xs text-zinc-500">Est. 1RM</p>
                  <p className="text-lg font-semibold">{best1RM} kg</p>
                </div>
              )}
            </div>
          </section>
        )}

        {chartData.length > 0 && (
          <>
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
                Weight over time
              </h2>
              <WeightChart data={chartData} />
            </section>
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
                Estimated 1RM over time
              </h2>
              <Estimated1RMChart data={chartData} />
            </section>
          </>
        )}

        {workouts.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
              History
            </h2>
            <WorkoutHistory workouts={workouts} exerciseId={id} />
          </section>
        )}
      </main>
    </>
  );
}
