"use server";

import { getBodyweightStats } from "@/app/actions/bodyweight";
import { getProfile } from "@/app/actions/profile";
import {
  getAll1RMProgression,
  type Estimated1RMByExercise,
} from "@/app/actions/insights";
import { createServerClient } from "@/lib/supabase/server";
import {
  computeStrengthRanking,
  categoryToStrengthMuscles,
  type StrengthRankingOutput,
  type StrengthRankMuscle,
  STRENGTH_RANK_MUSCLES,
} from "@/lib/strengthRanking";

/**
 * Get best estimated 1RM (kg) per exercise from full progression.
 * Uses the maximum 1RM ever recorded per exercise.
 */
function best1RMByExerciseFromProgression(
  estimated1RMByExercise: Estimated1RMByExercise
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [exerciseId, points] of Object.entries(estimated1RMByExercise)) {
    if (points?.length) {
      const best = Math.max(...points.map((p) => p.estimated1RM));
      out[exerciseId] = Math.round(best * 10) / 10;
    }
  }
  return out;
}

export type BestExerciseByMuscle = {
  name: string;
  estimated1RM: number;
};

/** Up to 3 exercises per muscle, sorted by estimated1RM descending (for rank improvement UI). */
export type TopExercisesByMuscle = Record<StrengthRankMuscle, BestExerciseByMuscle[]>;

export type StrengthRankingWithExercises = StrengthRankingOutput & {
  bestExerciseByMuscle: Record<StrengthRankMuscle, BestExerciseByMuscle | null>;
  /** Top 2–3 exercises per muscle by 1RM (for multi-exercise improvement display). */
  topExercisesByMuscle: TopExercisesByMuscle;
};

export type GetStrengthRankingResult = {
  data: StrengthRankingWithExercises | null;
  error?: string;
};

/** Default ranking when user has no workouts, no 1RM data, or no bodyweight: Newbie I, percentile 0. */
function defaultStrengthRankingWithExercises(): StrengthRankingWithExercises {
  const musclePercentiles = {
    chest: 0,
    back: 0,
    legs: 0,
    shoulders: 0,
    arms: 0,
  } as Record<StrengthRankMuscle, number>;
  const muscleRanks = {
    chest: { percentile: 0, rank: "Newbie", rankLabel: "Newbie I" },
    back: { percentile: 0, rank: "Newbie", rankLabel: "Newbie I" },
    legs: { percentile: 0, rank: "Newbie", rankLabel: "Newbie I" },
    shoulders: { percentile: 0, rank: "Newbie", rankLabel: "Newbie I" },
    arms: { percentile: 0, rank: "Newbie", rankLabel: "Newbie I" },
  } as Record<StrengthRankMuscle, { percentile: number; rank: string; rankLabel: string }>;
  const bestExerciseByMuscle: Record<StrengthRankMuscle, BestExerciseByMuscle | null> = {
    chest: null,
    back: null,
    legs: null,
    shoulders: null,
    arms: null,
  };
  const topExercisesByMuscle: TopExercisesByMuscle = {
    chest: [],
    back: [],
    legs: [],
    shoulders: [],
    arms: [],
  };
  return {
    musclePercentiles,
    muscleRanks,
    overallPercentile: 0,
    overallRank: "Newbie",
    overallRankLabel: "Newbie I",
    bestExerciseByMuscle,
    topExercisesByMuscle,
  };
}

/**
 * Fetches bodyweight, 1RM progression, and exercise categories, then
 * computes the Liftly strength ranking (muscle percentiles, ranks, overall).
 * Use for muscle diagram colors and rank badges.
 * When user has no bodyweight or no workout/1RM data, returns default Newbie I ranking so the UI always displays something.
 */
export async function getStrengthRanking(): Promise<GetStrengthRankingResult> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const [bodyweightStats, profile, oneRMRes] = await Promise.all([
      getBodyweightStats(),
      getProfile(),
      getAll1RMProgression(),
    ]);

    // Bodyweight in kg: prefer latest log, fallback to profile
    const bodyweightKg =
      bodyweightStats.latest?.weight ??
      (profile?.body_weight != null ? profile.body_weight : 0);

    const estimated1RMByExercise = oneRMRes.data ?? {};
    const best1RMByExercise = best1RMByExerciseFromProgression(estimated1RMByExercise);
    const exerciseIds = Object.keys(best1RMByExercise);

    // No bodyweight or no workout/1RM data → return default Newbie I ranking so UI always shows something
    if (bodyweightKg <= 0 || exerciseIds.length === 0) {
      return { data: defaultStrengthRankingWithExercises() };
    }

    const { data: exercises } = await supabase
      .from("exercises")
      .select("id, name, category_id")
      .in("id", exerciseIds)
      .eq("user_id", user.id);
    const categoryIds = [...new Set((exercises ?? []).map((e) => e.category_id))];
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", user.id)
      .in("id", categoryIds);

    const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
    const categoryByExercise: Record<string, string> = {};
    for (const e of exercises ?? []) {
      const name = categoryNameById.get(e.category_id);
      if (name != null) categoryByExercise[e.id] = name;
    }

    const output = computeStrengthRanking({
      best1RMByExercise,
      categoryByExercise,
      bodyweightKg,
      liftlyUserPercentiles: null, // Future: blend when Liftly has enough users
    });

    const bestExerciseByMuscle: Record<StrengthRankMuscle, BestExerciseByMuscle | null> = {
      chest: null,
      back: null,
      legs: null,
      shoulders: null,
      arms: null,
    };
    const topExercisesByMuscle: TopExercisesByMuscle = {
      chest: [],
      back: [],
      legs: [],
      shoulders: [],
      arms: [],
    };
    for (const muscle of STRENGTH_RANK_MUSCLES) {
      const candidates: { exerciseId: string; name: string; estimated1RM: number }[] = [];
      for (const [exerciseId, categoryName] of Object.entries(categoryByExercise)) {
        if (categoryToStrengthMuscles(categoryName).includes(muscle)) {
          const estimated1RM = best1RMByExercise[exerciseId] ?? 0;
          const ex = exercises?.find((e) => e.id === exerciseId);
          if (ex && estimated1RM > 0)
            candidates.push({ exerciseId, name: ex.name, estimated1RM });
        }
      }
      if (candidates.length > 0) {
        const sorted = [...candidates].sort((a, b) => b.estimated1RM - a.estimated1RM);
        const best = sorted[0];
        bestExerciseByMuscle[muscle] = { name: best.name, estimated1RM: best.estimated1RM };
        topExercisesByMuscle[muscle] = sorted.slice(0, 3).map(({ name, estimated1RM }) => ({ name, estimated1RM }));
      }
    }

    return {
      data: {
        ...output,
        bestExerciseByMuscle,
        topExercisesByMuscle,
      },
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}
