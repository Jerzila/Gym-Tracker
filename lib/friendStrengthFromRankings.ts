import { RANK_SLUGS, type RankSlug } from "@/lib/rankBadges";
import {
  STRENGTH_RANK_MUSCLES,
  strengthScoreToRank,
  type MuscleRankOutput,
  type StrengthRankMuscle,
} from "@/lib/strengthRanking";

const MUSCLE_DISPLAY_LABEL: Record<StrengthRankMuscle, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  traps: "Traps",
  core: "Core",
};

function parseRankSlug(raw: unknown): RankSlug {
  const s = String(raw ?? "").trim();
  return (RANK_SLUGS as readonly string[]).includes(s) ? (s as RankSlug) : "newbie";
}

function parseTier(raw: unknown): "I" | "II" | "III" {
  const s = String(raw ?? "");
  return s === "II" || s === "III" ? s : "I";
}

/**
 * Hydrate `rankings.muscle_ranks` / `muscle_scores` into shapes expected by strength diagram components.
 */
export function parseStoredRankingsMusclePayload(
  muscleRanksJson: unknown,
  muscleScoresJson: unknown
): {
  muscleRanks: Record<StrengthRankMuscle, MuscleRankOutput>;
  exerciseCountByMuscle: Record<StrengthRankMuscle, number>;
  muscleScores: Record<StrengthRankMuscle, number>;
} {
  const scoresObj =
    muscleScoresJson && typeof muscleScoresJson === "object" && !Array.isArray(muscleScoresJson)
      ? (muscleScoresJson as Record<string, unknown>)
      : {};
  const ranksObj =
    muscleRanksJson && typeof muscleRanksJson === "object" && !Array.isArray(muscleRanksJson)
      ? (muscleRanksJson as Record<string, unknown>)
      : {};

  const muscleRanks = {} as Record<StrengthRankMuscle, MuscleRankOutput>;
  const exerciseCountByMuscle = {} as Record<StrengthRankMuscle, number>;
  const muscleScores = {} as Record<StrengthRankMuscle, number>;

  for (const m of STRENGTH_RANK_MUSCLES) {
    const scoreRaw = Number(scoresObj[m]);
    const safeScore = Number.isFinite(scoreRaw) ? scoreRaw : 0;
    muscleScores[m] = safeScore;
    exerciseCountByMuscle[m] = safeScore > 0 ? 1 : 0;

    const raw = ranksObj[m];
    const fallback = strengthScoreToRank(safeScore, m);
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      const ss = Number(o.strengthScore);
      muscleRanks[m] = {
        strengthScore: Number.isFinite(ss) ? ss : safeScore,
        rank: String(o.rank ?? fallback.rank),
        tier: parseTier(o.tier),
        rankLabel: String(o.rankLabel ?? fallback.rankLabel),
        rankSlug: parseRankSlug(o.rankSlug),
        progressToNextPct: Number.isFinite(Number(o.progressToNextPct)) ? Number(o.progressToNextPct) : 0,
        nextRankLabel: o.nextRankLabel != null && String(o.nextRankLabel).length > 0 ? String(o.nextRankLabel) : null,
        topPercentileLabel: String(o.topPercentileLabel ?? fallback.topPercentileLabel),
      };
    } else {
      muscleRanks[m] = {
        strengthScore: safeScore,
        rank: fallback.rank,
        tier: fallback.tier,
        rankLabel: fallback.rankLabel,
        rankSlug: fallback.rankSlug,
        progressToNextPct: fallback.progressToNextPct,
        nextRankLabel: fallback.nextRankLabel,
        topPercentileLabel: fallback.topPercentileLabel,
      };
    }
  }

  return { muscleRanks, exerciseCountByMuscle, muscleScores };
}

export type StrongestMuscleSummary = {
  muscle: StrengthRankMuscle;
  linePrimary: string;
  linePercentile: string;
};

/** Strongest muscle by stored `muscle_scores` (ties: first in STRENGTH_RANK_MUSCLES order). */
export function strongestMuscleSummaryFromPayload(
  muscleRanks: Record<StrengthRankMuscle, MuscleRankOutput>,
  muscleScores: Record<StrengthRankMuscle, number>
): StrongestMuscleSummary | null {
  let best: StrengthRankMuscle | null = null;
  let bestScore = -1;
  for (const m of STRENGTH_RANK_MUSCLES) {
    const sc = muscleScores[m];
    if (sc > bestScore) {
      bestScore = sc;
      best = m;
    }
  }
  if (best == null || bestScore <= 0) return null;
  const r = muscleRanks[best];
  return {
    muscle: best,
    linePrimary: `${MUSCLE_DISPLAY_LABEL[best]} • ${r.rank}`,
    linePercentile: `${r.topPercentileLabel} of lifters`,
  };
}
