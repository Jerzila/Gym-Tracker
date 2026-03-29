import { getWeeklyComparison, getMuscleBalanceRadarData, getMuscleDistribution } from "@/app/actions/insights";
import { getProfile } from "@/app/actions/profile";
import { getBodyweightStats } from "@/app/actions/bodyweight";
import { getLastWorkoutSummary } from "@/app/actions/workouts";
import { getStrengthRanking } from "@/app/actions/strengthRanking";
import { DashboardPageContent } from "@/app/components/DashboardPageContent";

export default async function DashboardPage() {
  const [
    weeklyRes,
    bodyweightStats,
    lastWorkoutRes,
    categoryRes,
    muscleRes,
    profile,
    strengthRankingRes,
  ] = await Promise.all([
    getWeeklyComparison(),
    getBodyweightStats(),
    getLastWorkoutSummary(),
    getMuscleBalanceRadarData("this_week"),
    getMuscleDistribution("this_week"),
    getProfile(),
    getStrengthRanking(),
  ]);
  const gender = profile?.gender === "female" ? "female" : "male";

  const weekly = weeklyRes.error ? null : weeklyRes.data;
  const lastWorkout = lastWorkoutRes.data ?? null;
  const muscleBalanceRadar = categoryRes.data ?? null;
  const muscleDistribution = muscleRes.data?.current ?? null;
  const strengthRanking = strengthRankingRes.data ?? null;

  return (
    <DashboardPageContent
      weekly={weekly}
      bodyweightStats={bodyweightStats}
      profileWeightKg={profile?.body_weight ?? null}
      heightCm={profile?.height ?? null}
      storedFfmi={profile?.ffmi ?? null}
      initialBodyFatPercent={profile?.body_fat_percent ?? null}
      lastWorkout={lastWorkout}
      muscleBalanceRadar={muscleBalanceRadar}
      muscleDistribution={muscleDistribution}
      gender={gender}
      strengthRanking={strengthRanking}
    />
  );
}
