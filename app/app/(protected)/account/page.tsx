import { getProfile } from "@/app/actions/profile";
import { getStrengthRanking } from "@/app/actions/strengthRanking";
import { getAccountLifetimeStats, type AccountLifetimeStats } from "@/app/actions/workouts";
import { AccountAchievementsCard } from "@/app/components/AccountAchievementsCard";
import { AccountHeroSection } from "@/app/components/AccountHeroSection";
import { AccountOverallStatsCard } from "@/app/components/AccountOverallStatsCard";
import { AccountRankSection } from "@/app/components/AccountRankSection";
import { overallRankDisplayFromOutput } from "@/lib/strengthRanking";

export default async function AccountPage() {
  const [profile, strengthRes, statsRes] = await Promise.all([
    getProfile(),
    getStrengthRanking(),
    getAccountLifetimeStats(),
  ]);

  const strengthRanking = strengthRes.data ?? null;
  const stats: AccountLifetimeStats = statsRes.data ?? {
    workoutCount: 0,
    exerciseCount: 0,
    setCount: 0,
    prCount: 0,
  };

  const rankDisplay = strengthRanking ? overallRankDisplayFromOutput(strengthRanking) : null;

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 pb-24 pt-4 sm:px-6">
      <AccountHeroSection profile={profile} />
      <AccountRankSection display={rankDisplay} />
      <AccountOverallStatsCard stats={stats} />
      <AccountAchievementsCard
        workoutCount={stats.workoutCount}
        prCount={stats.prCount}
        overallRank={strengthRanking?.overallRank ?? null}
      />
    </main>
  );
}
