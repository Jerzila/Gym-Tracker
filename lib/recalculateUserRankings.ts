"use server";

import { computeStrengthRankingBundleForUser } from "@/lib/computeStrengthRankingForUser";
import {
  computeUserLifetimeWorkoutAggregatesForUser,
  countWorkoutSessionsFromDate,
  isoDateDaysAgoUTC,
} from "@/lib/computeUserWorkoutAggregates";
import type { ExerciseDataPoint, StrengthRankingOutput } from "@/lib/strengthRanking";
import { computeStrengthRanking } from "@/lib/strengthRanking";
import { createServerClient } from "@/lib/supabase/server";

export type RecalculateUserRankingsSnapshot = {
  output: StrengthRankingOutput;
  exerciseDataPoints: ExerciseDataPoint[];
  workoutsLast30Days: number;
};

function overallPercentileNumberFromTopLabel(label: string): number {
  const m = String(label ?? "").trim().match(/Top\s*([\d.]+)\s*%/i);
  if (m) return parseFloat(m[1]);
  return 100;
}

type RecalculateOptions = {
  /** Reuse an existing server client (avoids a second Supabase session on hot paths). */
  supabase?: Awaited<ReturnType<typeof createServerClient>>;
};

export async function recalculateUserRankings(
  userId: string,
  options?: RecalculateOptions
): Promise<RecalculateUserRankingsSnapshot> {
  const supabase = options?.supabase ?? (await createServerClient());

  const computed = await computeStrengthRankingBundleForUser(supabase, userId);

  const result =
    computed.ok
      ? computed.bundle.output
      : computeStrengthRanking({ exerciseDataPoints: [], bodyweightKg: 0 });
  const exerciseDataPoints: ExerciseDataPoint[] = computed.ok ? computed.bundle.exerciseDataPoints : [];

  const { error: rankingsErr } = await supabase.from("rankings").upsert(
    {
      user_id: userId,
      overall_score: result.overallScore,
      overall_rank: result.overallRank,
      overall_rank_label: result.overallRankLabel,
      overall_rank_slug: result.overallRankSlug,
      overall_tier: result.overallTier,
      overall_progress_to_next_pct: result.overallProgressToNextPct,
      overall_next_rank_label: result.overallNextRankLabel,
      overall_top_percentile_label: result.overallTopPercentileLabel,
      muscle_scores: result.muscleScores,
      muscle_ranks: result.muscleRanks,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>,
    { onConflict: "user_id" }
  );
  if (rankingsErr) throw new Error(rankingsErr.message);

  const { data: agg, error: aggErr } = await computeUserLifetimeWorkoutAggregatesForUser(supabase, userId);
  if (aggErr) throw new Error(aggErr);

  const since30 = isoDateDaysAgoUTC(30);
  const { count: workoutsLast30, error: wErr } = await countWorkoutSessionsFromDate(supabase, userId, since30);
  if (wErr) throw new Error(wErr);

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      overall_rank: result.overallRankLabel,
      overall_percentile: overallPercentileNumberFromTopLabel(result.overallTopPercentileLabel),
      rank_badge: result.overallRankSlug,
      total_volume: agg?.totalVolumeKg ?? 0,
      total_prs: agg?.prCount ?? 0,
      workouts_last_30_days: workoutsLast30,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("id", userId);
  if (profileErr) throw new Error(profileErr.message);

  return {
    output: result,
    exerciseDataPoints,
    workoutsLast30Days: workoutsLast30,
  };
}
