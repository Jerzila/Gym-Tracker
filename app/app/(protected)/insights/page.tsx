import { getAdvancedStrengthAnalytics } from "@/app/actions/advancedStrengthAnalytics";
import { getExercises } from "@/app/actions/exercises";
import { getProfile } from "@/app/actions/profile";
import { getStrengthRanking, getWorkoutDateBounds } from "@/app/actions/strengthRanking";
import { InsightsPageContent } from "@/app/components/InsightsPageContent";

export default async function InsightsPage() {
  const [exercisesRes, profile, strengthRankingRes, boundsRes, advancedAnalyticsInitial] = await Promise.all([
    getExercises().catch(() => [] as Awaited<ReturnType<typeof getExercises>>),
    getProfile(),
    getStrengthRanking(),
    getWorkoutDateBounds(),
    getAdvancedStrengthAnalytics().catch((err) => ({
      categories: [],
      selectedCategoryId: null,
      selectedExerciseId: null,
      row: null,
      error: err instanceof Error ? err.message : "Could not load advanced analytics.",
    })),
  ]);
  const exercises = exercisesRes ?? [];
  const gender = profile?.gender === "female" ? "female" : "male";
  const strengthRanking = strengthRankingRes.data ?? null;
  const bounds = boundsRes.data;

  return (
    <main className="mx-auto max-w-xl px-4 py-4 sm:px-6 sm:py-8">
      <InsightsPageContent
        exercises={exercises}
        gender={gender}
        strengthRanking={strengthRanking}
        earliestWorkoutDate={bounds.earliestWorkoutDate}
        advancedAnalyticsInitial={advancedAnalyticsInitial}
      />
    </main>
  );
}
