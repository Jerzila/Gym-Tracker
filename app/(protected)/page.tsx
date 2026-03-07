import { getWeeklyComparison, getCategoryDistribution, getMuscleDistribution, getMuscleHeatmapData } from "@/app/actions/insights";
import { getProfile } from "@/app/actions/profile";
import { getBodyweightStats, getBodyweightLogs } from "@/app/actions/bodyweight";
import { getLastWorkoutSummary } from "@/app/actions/workouts";
import { DashboardPageContent } from "@/app/components/DashboardPageContent";

export default async function DashboardPage() {
  const [
    weeklyRes,
    bodyweightStats,
    bodyweightLogs,
    lastWorkoutRes,
    categoryRes,
    muscleRes,
    heatmapRes,
    profile,
  ] = await Promise.all([
    getWeeklyComparison(),
    getBodyweightStats(),
    getBodyweightLogs(),
    getLastWorkoutSummary(),
    getCategoryDistribution("this_week"),
    getMuscleDistribution("this_week"),
    getMuscleHeatmapData("this_week"),
    getProfile(),
  ]);
  const gender = profile?.gender === "female" ? "female" : "male";

  const weekly = weeklyRes.error ? null : weeklyRes.data;
  const lastWorkout = lastWorkoutRes.data ?? null;
  const categoryDistribution = categoryRes.data ?? null;
  const muscleDistribution = muscleRes.data?.current ?? null;
  const muscleHeatmapData = heatmapRes.data ?? [];

  const sparkline = bodyweightLogs
    .slice(0, 7)
    .map((l) => ({ date: l.date, weight: l.weight }));

  return (
    <DashboardPageContent
      weekly={weekly}
      bodyweightStats={bodyweightStats}
      bodyweightSparkline={sparkline}
      lastWorkout={lastWorkout}
      categoryDistribution={categoryDistribution}
      muscleDistribution={muscleDistribution}
      muscleHeatmapData={muscleHeatmapData}
      gender={gender}
    />
  );
}
