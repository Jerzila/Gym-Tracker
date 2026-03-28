"use server";

import {
  computeStrengthRankingBundleForUser,
  type CoreExerciseType,
  type CoreImprovementSuggestion,
} from "@/lib/computeStrengthRankingForUser";
import { createServerClient } from "@/lib/supabase/server";
import {
  categoryToStrengthMuscles,
  getNextRankThreshold,
  getWeightIncreaseSuggestions,
  getTopExercisesByMuscleForSuggestions,
  type StrengthRankingOutput,
  type StrengthRankMuscle,
  type WeightIncreaseSuggestion,
  STRENGTH_RANK_MUSCLES,
  PRIMARY_STRENGTH_RANK_MUSCLES,
} from "@/lib/strengthRanking";

export type { CoreExerciseType, CoreImprovementSuggestion };

export type BestExerciseByMuscle = {
  name: string;
  estimated1RM: number;
};

export type TopExercisesByMuscle = Record<StrengthRankMuscle, BestExerciseByMuscle[]>;

export type StrengthRankingWithExercises = StrengthRankingOutput & {
  bestExerciseByMuscle: Record<StrengthRankMuscle, BestExerciseByMuscle | null>;
  topExercisesByMuscle: TopExercisesByMuscle;
  improvementSuggestionsByMuscle: Record<StrengthRankMuscle, WeightIncreaseSuggestion[]>;
  visibleMuscles: StrengthRankMuscle[];
  exerciseCountByMuscle: Record<StrengthRankMuscle, number>;
  coreImprovementSuggestions: CoreImprovementSuggestion[];
};

export type GetStrengthRankingResult = {
  data: StrengthRankingWithExercises | null;
  error?: string;
};

const emptyMuscleRank = {
  strengthScore: 0,
  rank: "Newbie",
  tier: "I" as const,
  rankLabel: "Newbie I",
  rankSlug: "newbie" as const,
  progressToNextPct: 0,
  nextRankLabel: "Newbie II" as string | null,
  topPercentileLabel: "Top 96.6%",
};

function defaultStrengthRankingWithExercises(): StrengthRankingWithExercises {
  const zeros = {
    chest: 0,
    back: 0,
    legs: 0,
    shoulders: 0,
    biceps: 0,
    triceps: 0,
    forearms: 0,
    traps: 0,
    core: 0,
  } as Record<StrengthRankMuscle, number>;
  const muscleRanks = Object.fromEntries(
    STRENGTH_RANK_MUSCLES.map((m) => [m, { ...emptyMuscleRank }])
  ) as Record<StrengthRankMuscle, typeof emptyMuscleRank>;
  const bestExerciseByMuscle: Record<StrengthRankMuscle, BestExerciseByMuscle | null> = {
    chest: null,
    back: null,
    legs: null,
    shoulders: null,
    biceps: null,
    triceps: null,
    forearms: null,
    traps: null,
    core: null,
  };
  const topExercisesByMuscle: TopExercisesByMuscle = {
    chest: [],
    back: [],
    legs: [],
    shoulders: [],
    biceps: [],
    triceps: [],
    forearms: [],
    traps: [],
    core: [],
  };
  const improvementSuggestionsByMuscle = Object.fromEntries(
    STRENGTH_RANK_MUSCLES.map((m) => [m, [] as WeightIncreaseSuggestion[]])
  ) as Record<StrengthRankMuscle, WeightIncreaseSuggestion[]>;
  return {
    muscleScores: { ...zeros },
    muscleRanks,
    musclePercentiles: { ...zeros },
    overallScore: 0,
    overallRank: "Newbie",
    overallRankLabel: "Newbie I",
    overallRankSlug: "newbie",
    overallTier: "I" as const,
    overallProgressToNextPct: 0,
    overallNextRankLabel: "Newbie II",
    overallNextRankSlug: "newbie" as const,
    overallNextRankTier: "II" as const,
    overallTopPercentileLabel: "Top 96.6%",
    overallNextTopPercentileLabel: "Top 93.3%",
    overallPercentile: 0,
    bestExerciseByMuscle,
    topExercisesByMuscle,
    improvementSuggestionsByMuscle,
    visibleMuscles: [...PRIMARY_STRENGTH_RANK_MUSCLES],
    exerciseCountByMuscle: { ...zeros },
    coreImprovementSuggestions: [],
  };
}

/**
 * Fetches bodyweight, 1RM progression, and exercise categories, then
 * computes the Liftly strength ranking (muscle percentiles, ranks, overall).
 * Same core math as `rankings` persistence (see computeStrengthRankingBundleForUser).
 */
export async function getStrengthRanking(): Promise<GetStrengthRankingResult> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const computed = await computeStrengthRankingBundleForUser(supabase, user.id);
    if (!computed.ok) {
      return { data: defaultStrengthRankingWithExercises() };
    }

    const {
      output,
      exerciseDataPoints,
      exerciseCountByMuscle,
      categoryByExercise,
      bodyweightKg,
      coreImprovementSuggestions,
    } = computed.bundle;

    const topExercisesData = getTopExercisesByMuscleForSuggestions(exerciseDataPoints);

    const bestExerciseByMuscle: Record<StrengthRankMuscle, BestExerciseByMuscle | null> = {
      chest: null,
      back: null,
      legs: null,
      shoulders: null,
      biceps: null,
      triceps: null,
      forearms: null,
      traps: null,
      core: null,
    };
    const topExercisesByMuscle: TopExercisesByMuscle = {
      chest: [],
      back: [],
      legs: [],
      shoulders: [],
      biceps: [],
      triceps: [],
      forearms: [],
      traps: [],
      core: [],
    };
    const improvementSuggestionsByMuscle = Object.fromEntries(
      STRENGTH_RANK_MUSCLES.map((m) => [m, [] as WeightIncreaseSuggestion[]])
    ) as Record<StrengthRankMuscle, WeightIncreaseSuggestion[]>;

    for (const muscle of STRENGTH_RANK_MUSCLES) {
      const list = topExercisesData[muscle] ?? [];
      if (list.length > 0) {
        bestExerciseByMuscle[muscle] = { name: list[0].name, estimated1RM: list[0].estimated1RM };
        topExercisesByMuscle[muscle] = list.map(({ name, estimated1RM }) => ({ name, estimated1RM }));
        if (muscle !== "core") {
          const nextScore = getNextRankThreshold(output.muscleScores[muscle], muscle);
          if (nextScore != null && nextScore > output.muscleScores[muscle]) {
            const suggestions = getWeightIncreaseSuggestions(
              bodyweightKg > 0 ? bodyweightKg : 1,
              output.muscleScores[muscle],
              nextScore,
              list.map(({ exerciseId, name, estimated1RM }) => ({
                exerciseId,
                name,
                estimated1RM,
              }))
            );
            improvementSuggestionsByMuscle[muscle] = suggestions;
          }
        }
      }
    }

    const hasExerciseFor = (muscle: StrengthRankMuscle) =>
      Object.values(categoryByExercise).some((cat) => categoryToStrengthMuscles(cat).includes(muscle));

    const visibleMuscles: StrengthRankMuscle[] = [
      ...PRIMARY_STRENGTH_RANK_MUSCLES,
      ...(exerciseCountByMuscle.forearms > 0 ? (["forearms"] as const) : []),
      ...(exerciseCountByMuscle.core > 0 ? (["core"] as const) : []),
      ...(hasExerciseFor("traps") ? (["traps"] as const) : []),
    ];

    return {
      data: {
        ...output,
        bestExerciseByMuscle,
        topExercisesByMuscle,
        improvementSuggestionsByMuscle,
        visibleMuscles,
        exerciseCountByMuscle,
        coreImprovementSuggestions,
      },
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}
