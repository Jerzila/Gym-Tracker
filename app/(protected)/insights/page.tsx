import { getExercises } from "@/app/actions/exercises";
import { getProfile } from "@/app/actions/profile";
import { getStrengthRanking } from "@/app/actions/strengthRanking";
import { InsightsPageContent } from "@/app/components/InsightsPageContent";

export default async function InsightsPage() {
  const [exercisesRes, profile, strengthRankingRes] = await Promise.all([
    getExercises().catch(() => [] as Awaited<ReturnType<typeof getExercises>>),
    getProfile(),
    getStrengthRanking(),
  ]);
  const exercises = exercisesRes ?? [];
  const gender = profile?.gender === "female" ? "female" : "male";
  const strengthRanking = strengthRankingRes.data ?? null;

  return (
    <>
      <div className="border-b border-zinc-800/60 px-4 py-3 sm:px-6">
        <h2 className="text-lg font-semibold tracking-tight">Insights</h2>
      </div>

      <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <InsightsPageContent
          exercises={exercises}
          gender={gender}
          strengthRanking={strengthRanking}
        />
      </main>
    </>
  );
}
