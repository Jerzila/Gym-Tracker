"use server";

import {
  computeStrengthRankingBundleForUser,
  type CoreExerciseType,
  type CoreImprovementSuggestion,
  type CoreTopExerciseForDisplay,
} from "@/lib/computeStrengthRankingForUser";
import { parseStoredRankingsMusclePayload } from "@/lib/friendStrengthFromRankings";
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
  /** Timed holds (e.g. plank): estimated1RM is best time in seconds. */
  isDurationSeconds?: boolean;
  /** Rep-based core moves: estimated1RM is max reps. */
  isReps?: boolean;
};

function bestExerciseRowsFromCoreTop(rows: CoreTopExerciseForDisplay[]): BestExerciseByMuscle[] {
  return rows.map((x) => ({
    name: x.name,
    estimated1RM: x.displayEstimated1RM,
    ...(x.isDurationSeconds ? { isDurationSeconds: true as const } : {}),
    ...(x.isReps ? { isReps: true as const } : {}),
  }));
}

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

export type WorkoutDateBounds = {
  earliestWorkoutDate: string | null;
  latestWorkoutDate: string | null;
};

const emptyMuscleRank = {
  strengthScore: 0,
  rank: "Newbie",
  tier: "I" as const,
  rankLabel: "Newbie I",
  rankSlug: "newbie" as const,
  progressToNextPct: 0,
  nextRankLabel: "Newbie II" as string | null,
  topPercentileLabel: "Top 97%",
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
    overallTopPercentileLabel: "Top 97%",
    overallNextTopPercentileLabel: "Top 93%",
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
      categoryNamesByExercise,
      bodyweightKg,
      coreImprovementSuggestions,
      coreTopExercisesForDisplay,
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
        bestExerciseByMuscle[muscle] = {
          name: list[0].name,
          estimated1RM: list[0].estimated1RM,
          ...(list[0].isDurationSeconds ? { isDurationSeconds: true as const } : {}),
        };
        topExercisesByMuscle[muscle] = list.map(({ name, estimated1RM, isDurationSeconds }) => ({
          name,
          estimated1RM,
          ...(isDurationSeconds ? { isDurationSeconds: true as const } : {}),
        }));
        if (muscle !== "core") {
          const nextScore = getNextRankThreshold(output.muscleScores[muscle], muscle);
          const forKgSuggestions = list.filter((x) => !x.isDurationSeconds);
          if (
            nextScore != null &&
            nextScore > output.muscleScores[muscle] &&
            forKgSuggestions.length > 0
          ) {
            const suggestions = getWeightIncreaseSuggestions(
              bodyweightKg > 0 ? bodyweightKg : 1,
              output.muscleScores[muscle],
              nextScore,
              forKgSuggestions.map(({ exerciseId, name, estimated1RM }) => ({
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

    const coreTopRows = bestExerciseRowsFromCoreTop(coreTopExercisesForDisplay);
    if (coreTopRows.length > 0) {
      bestExerciseByMuscle.core = coreTopRows[0];
      topExercisesByMuscle.core = coreTopRows;
    }

    const hasExerciseFor = (muscle: StrengthRankMuscle) =>
      Object.values(categoryNamesByExercise).some((cats) =>
        cats.some((cat) => categoryToStrengthMuscles(cat).includes(muscle))
      );

    const visibleMuscles: StrengthRankMuscle[] = [
      ...PRIMARY_STRENGTH_RANK_MUSCLES,
      ...(exerciseCountByMuscle.forearms > 0 ? (["forearms"] as const) : []),
      ...(exerciseCountByMuscle.core > 0 || output.muscleScores.core > 0 ? (["core"] as const) : []),
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

export async function getWorkoutDateBounds(): Promise<{
  data: WorkoutDateBounds;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: { earliestWorkoutDate: null, latestWorkoutDate: null }, error: "Not authenticated" };

    const [earliestRes, latestRes] = await Promise.all([
      supabase
        .from("workouts")
        .select("date")
        .eq("user_id", user.id)
        .order("date", { ascending: true })
        .limit(1),
      supabase
        .from("workouts")
        .select("date")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1),
    ]);

    const earliestWorkoutDate = earliestRes.data?.[0]?.date ?? null;
    const latestWorkoutDate = latestRes.data?.[0]?.date ?? null;
    return { data: { earliestWorkoutDate, latestWorkoutDate } };
  } catch (e) {
    return {
      data: { earliestWorkoutDate: null, latestWorkoutDate: null },
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

export async function getStrengthRankingAtDate(endDateISO: string): Promise<GetStrengthRankingResult> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const computed = await computeStrengthRankingBundleForUser(supabase, user.id, { endDate: endDateISO });
    if (!computed.ok) {
      return { data: defaultStrengthRankingWithExercises() };
    }

    const {
      output,
      exerciseDataPoints,
      exerciseCountByMuscle,
      categoryNamesByExercise,
      bodyweightKg,
      coreImprovementSuggestions,
      coreTopExercisesForDisplay,
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
        bestExerciseByMuscle[muscle] = {
          name: list[0].name,
          estimated1RM: list[0].estimated1RM,
          ...(list[0].isDurationSeconds ? { isDurationSeconds: true as const } : {}),
        };
        topExercisesByMuscle[muscle] = list.map(({ name, estimated1RM, isDurationSeconds }) => ({
          name,
          estimated1RM,
          ...(isDurationSeconds ? { isDurationSeconds: true as const } : {}),
        }));
        if (muscle !== "core") {
          const nextScore = getNextRankThreshold(output.muscleScores[muscle], muscle);
          const forKgSuggestions = list.filter((x) => !x.isDurationSeconds);
          if (
            nextScore != null &&
            nextScore > output.muscleScores[muscle] &&
            forKgSuggestions.length > 0
          ) {
            const suggestions = getWeightIncreaseSuggestions(
              bodyweightKg > 0 ? bodyweightKg : 1,
              output.muscleScores[muscle],
              nextScore,
              forKgSuggestions.map(({ exerciseId, name, estimated1RM }) => ({
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

    const coreTopRowsAtDate = bestExerciseRowsFromCoreTop(coreTopExercisesForDisplay);
    if (coreTopRowsAtDate.length > 0) {
      bestExerciseByMuscle.core = coreTopRowsAtDate[0];
      topExercisesByMuscle.core = coreTopRowsAtDate;
    }

    const hasExerciseFor = (muscle: StrengthRankMuscle) =>
      Object.values(categoryNamesByExercise).some((cats) =>
        cats.some((cat) => categoryToStrengthMuscles(cat).includes(muscle))
      );

    const visibleMuscles: StrengthRankMuscle[] = [
      ...PRIMARY_STRENGTH_RANK_MUSCLES,
      ...(exerciseCountByMuscle.forearms > 0 ? (["forearms"] as const) : []),
      ...(exerciseCountByMuscle.core > 0 || output.muscleScores.core > 0 ? (["core"] as const) : []),
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

/**
 * Build a `StrengthRankingWithExercises` for another user's stored `rankings` row
 * (friend profile, compare view). Muscle tap panel has no best exercise / suggestions.
 */
export async function rankingWithExercisesFromStoredRankingsJson(
  muscleRanksJson: unknown,
  muscleScoresJson: unknown
): Promise<StrengthRankingWithExercises> {
  const { muscleRanks, exerciseCountByMuscle, muscleScores } = parseStoredRankingsMusclePayload(
    muscleRanksJson,
    muscleScoresJson
  );
  const base = defaultStrengthRankingWithExercises();
  return {
    ...base,
    muscleRanks,
    exerciseCountByMuscle,
    muscleScores,
  };
}
