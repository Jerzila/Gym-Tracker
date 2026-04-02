import { notFound } from "next/navigation";
import { getExerciseById } from "@/app/actions/exercises";
import { getProfile } from "@/app/actions/profile";
import {
  getHeaviestWeight,
  getBestEstimated1RM,
  getMaxRepsAtWeight,
  getStrengthProgress,
  getSessionBestStrengthSet,
  getBestReps,
  getRepsStrengthProgress,
  sessionMaxRepsInWorkout,
} from "@/lib/pr";
import { ExercisePRs } from "@/app/components/ExercisePRs";
import { StrengthRecommendationCard } from "@/app/components/StrengthRecommendationCard";
import { WeightChart } from "@/app/components/WeightChart";
import { Estimated1RMChart } from "@/app/components/Estimated1RMChart";
import { RepsOverTimeChart } from "@/app/components/RepsOverTimeChart";
import { WorkoutHistory } from "@/app/components/WorkoutHistory";
import { getStrengthRecommendation } from "@/lib/strengthRecommendation";
import { ExerciseLogAndNotes } from "@/app/components/ExerciseLogAndNotes";
import { createServerClient } from "@/lib/supabase/server";
import { bodyweightLoadFractionFromCategoryName } from "@/lib/bodyweightCategoryFraction";
import { loadBodyweightSeriesForUser, resolveBodyweightKgFromLogs } from "@/lib/bodyweightAsOf";
import { normalizeLoadType } from "@/lib/loadType";
import { formatLoggedSetsSummary } from "@/lib/formatBodyweightSets";
import { weightUnitLabel } from "@/lib/formatWeight";

type Props = { params: Promise<{ id: string }> };

export default async function ExercisePage({ params }: Props) {
  const { id } = await params;
  const { exercise, error } = await getExerciseById(id);

  if (error || !exercise) notFound();

  const profile = await getProfile();
  const units = profile?.units === "imperial" ? "imperial" : "metric";
  const unitLabel = weightUnitLabel(units);

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let bwFor: ((isoDate: string) => number) | undefined;
  let bodyweightLoadFraction = 1;
  if (user && normalizeLoadType(exercise.load_type) === "bodyweight") {
    const series = await loadBodyweightSeriesForUser(supabase, user.id);
    bwFor = (iso) => resolveBodyweightKgFromLogs(iso, series.logsAsc, series.profileKg);
    if (exercise.category_id) {
      const { data: catRow } = await supabase
        .from("categories")
        .select("name")
        .eq("id", exercise.category_id)
        .eq("user_id", user.id)
        .maybeSingle();
      bodyweightLoadFraction = bodyweightLoadFractionFromCategoryName(
        (catRow as { name?: string } | null)?.name ?? ""
      );
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const bwForRecommendation =
    bwFor != null
      ? bwFor(today)
      : profile?.body_weight != null && Number.isFinite(Number(profile.body_weight))
        ? Number(profile.body_weight)
        : 0;

  const workouts = exercise.workouts ?? [];
  const prWorkouts = workouts.map((w) => ({
    weight: w.weight,
    date: w.date,
    load_type: exercise.load_type,
    bodyweight_load_fraction: bodyweightLoadFraction,
    sets: w.sets ?? [],
  }));

  const isBodyweight = normalizeLoadType(exercise.load_type) === "bodyweight";

  const heaviest = getHeaviestWeight(prWorkouts);
  const best1RM = getBestEstimated1RM(prWorkouts, bwFor);
  const maxRepsAtHeaviest =
    heaviest != null ? getMaxRepsAtWeight(prWorkouts, heaviest, exercise.load_type, bwFor) : null;
  const strengthProgress = getStrengthProgress(prWorkouts);
  const bestReps = isBodyweight ? getBestReps(prWorkouts) : null;
  const repsStrengthProgress = isBodyweight ? getRepsStrengthProgress(prWorkouts) : null;
  const repMin = Number.isFinite(exercise.rep_min) && exercise.rep_min > 0 ? exercise.rep_min : 6;
  const repMax = Number.isFinite(exercise.rep_max) && exercise.rep_max >= repMin ? exercise.rep_max : Math.max(10, repMin);
  const strengthRecommendation = getStrengthRecommendation(
    prWorkouts,
    {
      minRep: repMin,
      maxRep: repMax,
    },
    exercise.load_type,
    {
      userBodyweightKg: bwForRecommendation,
      bodyweightLoadFraction,
    }
  );

  const chartData = workouts
    .slice()
    .reverse()
    .map((w) => {
      const weight = Number(w.weight);
      const stored1rm =
        w.estimated_1rm != null && Number.isFinite(Number(w.estimated_1rm)) && Number(w.estimated_1rm) > 0
          ? Number(w.estimated_1rm)
          : null;
      const bestSetInfo = getSessionBestStrengthSet(
        {
          weight,
          load_type: exercise.load_type,
          bodyweight_load_fraction: bodyweightLoadFraction,
          sets: w.sets ?? [],
          date: w.date,
        },
        bwFor
      );
      const est1RM =
        stored1rm ??
        (bestSetInfo != null &&
        Number.isFinite(bestSetInfo.estimated1RM) &&
        bestSetInfo.estimated1RM > 0
          ? bestSetInfo.estimated1RM
          : null);

      const bwSummary = formatLoggedSetsSummary(w.sets, exercise.load_type, units, unitLabel);
      const setsInline =
        bwSummary ||
        ((w.sets ?? []).length > 0
          ? (w.sets ?? [])
              .map((s) => {
                const wKg = s.weight != null ? Number(s.weight) : weight;
                return `${Number(wKg) || 0}×${Number(s.reps) || 0}`;
              })
              .join(" • ")
          : "");

      const sessionReps = sessionMaxRepsInWorkout({
        weight,
        date: w.date,
        load_type: exercise.load_type,
        bodyweight_load_fraction: bodyweightLoadFraction,
        sets: w.sets ?? [],
      });

      return {
        date: w.date,
        weight,
        estimated1RM: est1RM,
        bestSetWeight: bestSetInfo?.weightKg ?? null,
        bestSetReps: bestSetInfo?.reps ?? null,
        sessionMaxReps: sessionReps,
        setsInline,
      };
    });

  const showRepsOverTimeChart =
    isBodyweight && chartData.some((d) => (d.sessionMaxReps ?? 0) > 0);

  return (
    <>
      <div className="px-4 pt-4 sm:px-6">
        <h2 className="text-lg font-semibold tracking-tight">{exercise.name}</h2>
        {!isBodyweight && (
          <p className="mt-1 text-sm text-zinc-500">
            Target: {exercise.rep_min}–{exercise.rep_max} reps
          </p>
        )}
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

        {isBodyweight
          ? (bestReps != null || repsStrengthProgress != null) && (
              <ExercisePRs
                variant="bodyweight"
                bestReps={bestReps}
                strengthProgress={repsStrengthProgress}
              />
            )
          : (heaviest != null || best1RM != null || strengthProgress != null) && (
              <ExercisePRs
                heaviest={heaviest}
                best1RM={best1RM}
                maxRepsAtHeaviest={maxRepsAtHeaviest}
                strengthProgress={strengthProgress}
              />
            )}

        {(chartData.length > 0 || workouts.length > 0) && (
          <>
            <div className="border-t border-zinc-800/60 pt-8" aria-hidden />
            <div className="flex flex-col gap-6">
              {chartData.length > 0 && (
                <>
                  {!isBodyweight && (
                    <section>
                      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Weight over time
                      </h2>
                      <WeightChart data={chartData} />
                    </section>
                  )}
                  {isBodyweight ? (
                    showRepsOverTimeChart && (
                      <section>
                        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                          Reps over time
                        </h2>
                        <RepsOverTimeChart
                          data={chartData.map((d) => ({ date: d.date, reps: d.sessionMaxReps ?? 0 }))}
                        />
                      </section>
                    )
                  ) : (
                    <section>
                      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Estimated 1RM over time{" "}
                        <span className="normal-case font-normal text-zinc-600">
                          (max weight for 1 rep)
                        </span>
                      </h2>
                      <Estimated1RMChart data={chartData} />
                    </section>
                  )}
                </>
              )}
              {workouts.length > 0 && (
                <section>
                  <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    History
                  </h2>
                  <WorkoutHistory
                    workouts={workouts}
                    exerciseId={id}
                    loadType={exercise.load_type}
                  />
                </section>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
