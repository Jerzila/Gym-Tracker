import { getExercises } from "@/app/actions/exercises";
import { getProfile } from "@/app/actions/profile";
import { getStrengthRanking, getWorkoutDateBounds } from "@/app/actions/strengthRanking";
import { InsightsPageContent } from "@/app/components/InsightsPageContent";

export default async function InsightsPage() {
  const [exercisesRes, profile, strengthRankingRes, boundsRes] = await Promise.all([
    getExercises().catch(() => [] as Awaited<ReturnType<typeof getExercises>>),
    getProfile(),
    getStrengthRanking(),
    getWorkoutDateBounds(),
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
      />
    </main>
  );
}
