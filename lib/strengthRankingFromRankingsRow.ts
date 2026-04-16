import { RANK_SLUGS, type RankSlug } from "@/lib/rankBadges";
import {
  type MuscleRankOutput,
  type StrengthRankingOutput,
  type StrengthRankMuscle,
  STRENGTH_RANK_MUSCLES,
} from "@/lib/strengthRanking";

function isTier(x: unknown): x is "I" | "II" | "III" {
  return x === "I" || x === "II" || x === "III";
}

function isRankSlug(x: unknown): x is RankSlug {
  return typeof x === "string" && (RANK_SLUGS as readonly string[]).includes(x);
}

function parseMuscleRankOutput(raw: unknown): MuscleRankOutput | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const rank = typeof o.rank === "string" ? o.rank.trim() : "";
  const tier = o.tier;
  if (!rank || !isTier(tier)) return null;
  const strengthScore = Number(o.strengthScore);
  const rankLabel = typeof o.rankLabel === "string" ? o.rankLabel : "";
  if (!isRankSlug(o.rankSlug)) return null;
  const rankSlug = o.rankSlug;
  const progressToNextPct = Number(o.progressToNextPct);
  const nextRankLabel =
    o.nextRankLabel == null ? null : String(o.nextRankLabel);
  const topPercentileLabel =
    typeof o.topPercentileLabel === "string" ? o.topPercentileLabel : "";
  if (!Number.isFinite(strengthScore) || !rankLabel || !topPercentileLabel) return null;
  return {
    strengthScore,
    rank,
    tier,
    rankLabel,
    rankSlug,
    progressToNextPct: Number.isFinite(progressToNextPct) ? progressToNextPct : 0,
    nextRankLabel,
    topPercentileLabel,
  };
}

/**
 * Rebuilds the last persisted strength snapshot from `rankings` (written by recalculate).
 * Used to avoid a second full workout scan when comparing before/after on workout save.
 */
export function strengthRankingOutputFromRankingsRow(
  row: Record<string, unknown> | null | undefined
): StrengthRankingOutput | null {
  if (!row) return null;

  const muscleScoresRaw = row.muscle_scores;
  const muscleRanksRaw = row.muscle_ranks;
  if (!muscleScoresRaw || typeof muscleScoresRaw !== "object") return null;
  if (!muscleRanksRaw || typeof muscleRanksRaw !== "object") return null;

  const scoresObj = muscleScoresRaw as Record<string, unknown>;
  const ranksObj = muscleRanksRaw as Record<string, unknown>;

  const muscleScores = {} as StrengthRankingOutput["muscleScores"];
  const muscleRanks = {} as StrengthRankingOutput["muscleRanks"];
  const musclePercentiles = {} as StrengthRankingOutput["musclePercentiles"];

  for (const m of STRENGTH_RANK_MUSCLES) {
    const s = Number(scoresObj[m]);
    const mr = parseMuscleRankOutput(ranksObj[m]);
    if (!Number.isFinite(s) || !mr) return null;
    muscleScores[m] = s;
    muscleRanks[m] = mr;
    musclePercentiles[m] = 0;
  }

  const overallScore = Number(row.overall_score);
  const overallRank = typeof row.overall_rank === "string" ? row.overall_rank : "";
  const overallRankLabel =
    typeof row.overall_rank_label === "string" ? row.overall_rank_label : "";
  if (!isRankSlug(row.overall_rank_slug)) return null;
  const overallRankSlug = row.overall_rank_slug;
  const overallTier = row.overall_tier;
  const overallProgressToNextPct = Number(row.overall_progress_to_next_pct);
  const overallNextRankLabel =
    row.overall_next_rank_label == null
      ? null
      : String(row.overall_next_rank_label);
  const overallTopPercentileLabel =
    typeof row.overall_top_percentile_label === "string"
      ? row.overall_top_percentile_label
      : "";

  if (
    !Number.isFinite(overallScore) ||
    !overallRank ||
    !overallRankLabel ||
    !overallTopPercentileLabel ||
    !isTier(overallTier) ||
    !Number.isFinite(overallProgressToNextPct)
  ) {
    return null;
  }

  return {
    muscleScores,
    muscleRanks,
    musclePercentiles,
    overallScore,
    overallRank,
    overallRankLabel,
    overallRankSlug,
    overallTier,
    overallProgressToNextPct,
    overallNextRankLabel,
    overallNextRankSlug: null,
    overallNextRankTier: null,
    overallTopPercentileLabel,
    overallNextTopPercentileLabel: null,
    overallPercentile: 0,
  };
}
