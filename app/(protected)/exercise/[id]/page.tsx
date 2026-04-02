import { notFound } from "next/navigation";
import { getExerciseById } from "@/app/actions/exercises";
import {
  getHeaviestWeight,
  getBestEstimated1RM,
  getMaxRepsAtWeight,
  getStrengthProgress,
} from "@/lib/pr";
import { epley1RM } from "@/lib/progression";
import { ExercisePRs } from "@/app/components/ExercisePRs";
import { StrengthRecommendationCard } from "@/app/components/StrengthRecommendationCard";
import { WeightChart } from "@/app/components/WeightChart";
import { Estimated1RMChart } from "@/app/components/Estimated1RMChart";
import { WorkoutHistory } from "@/app/components/WorkoutHistory";
import { getStrengthRecommendation } from "@/lib/strengthRecommendation";
import { ExerciseLogAndNotes } from "@/app/components/ExerciseLogAndNotes";

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
  const strengthProgress = getStrengthProgress(workouts);
  const repMin = Number.isFinite(exercise.rep_min) && exercise.rep_min > 0 ? exercise.rep_min : 6;
  const repMax = Number.isFinite(exercise.rep_max) && exercise.rep_max >= repMin ? exercise.rep_max : Math.max(10, repMin);
  const strengthRecommendation = getStrengthRecommendation(workouts, {
    minRep: repMin,
    maxRep: repMax,
  }, exercise.load_type);

  const chartData = workouts
    .slice()
    .reverse()
    .map((w) => {
      const weight = Number(w.weight);
      const bestSet =
        w.sets && w.sets.length > 0
          ? Math.max(
              ...w.sets.map((s) => {
                const wKg = s.weight != null ? Number(s.weight) : weight;
                return epley1RM(Number(wKg) || 0, Number(s.reps) || 0);
              })
            )
          : null;
      const est1RM = bestSet != null && Number.isFinite(bestSet) && bestSet > 0 ? bestSet : null;

      const bestSetInfo =
        (w.sets ?? []).length > 0
          ? (w.sets ?? []).reduce(
              (best, s) => {
                const wKg = s.weight != null ? Number(s.weight) : weight;
                const reps = Number(s.reps) || 0;
                const rm = epley1RM(Number(wKg) || 0, reps);
                if (!best || rm > best.rm) return { weight: Number(wKg) || 0, reps, rm };
                return best;
              },
              null as null | { weight: number; reps: number; rm: number }
            )
          : null;

      const setsInline =
        (w.sets ?? []).length > 0
          ? (w.sets ?? [])
              .map((s) => {
                const wKg = s.weight != null ? Number(s.weight) : weight;
                return `${Number(wKg) || 0}×${Number(s.reps) || 0}`;
              })
              .join(" • ")
          : "";

      return {
        date: w.date,
        // Weight graph should plot max set weight.
        weight,
        estimated1RM: est1RM,
        bestSetWeight: bestSetInfo?.weight ?? null,
        bestSetReps: bestSetInfo?.reps ?? null,
        setsInline,
      };
    });

  return (
    <>
      <div className="px-4 pt-4 sm:px-6">
        <h2 className="text-lg font-semibold tracking-tight">{exercise.name}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Target: {exercise.rep_min}–{exercise.rep_max} reps
        </p>
      </div>

      <main className="mx-auto max-w-xl px-4 pt-5 sm:px-6">
        <section className="pb-6">
          <ExerciseLogAndNotes
            exerciseId={id}
            repMin={exercise.rep_min}
            repMax={exercise.rep_max}
            loadType={exercise.load_type}
            initialNotes={exercise.notes ?? null}
          />
        </section>

        <div className="border-t border-zinc-800/60 pt-6" aria-hidden />
        <StrengthRecommendationCard recommendation={strengthRecommendation} />

        {(heaviest != null || best1RM != null || strengthProgress != null) && (
          <>
            <ExercisePRs
              heaviest={heaviest}
              best1RM={best1RM}
              maxRepsAtHeaviest={maxRepsAtHeaviest}
              strengthProgress={strengthProgress}
            />
          </>
        )}

        {(chartData.length > 0 || workouts.length > 0) && (
          <>
            <div className="border-t border-zinc-800/60 pt-8" aria-hidden />
            <div className="flex flex-col gap-6">
              {chartData.length > 0 && (
                <>
                  <section>
                    <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Weight over time
                    </h2>
                    <WeightChart data={chartData} />
                  </section>
                  <section>
                    <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Estimated 1RM over time{" "}
                      <span className="normal-case font-normal text-zinc-600">
                        (max weight for 1 rep)
                      </span>
                    </h2>
                    <Estimated1RMChart data={chartData} />
                  </section>
                </>
              )}
              {workouts.length > 0 && (
                <section>
                  <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    History
                  </h2>
                  <WorkoutHistory workouts={workouts} exerciseId={id} />
                </section>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
