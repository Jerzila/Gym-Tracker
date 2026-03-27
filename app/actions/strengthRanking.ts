"use server";

import { getBodyweightStats } from "@/app/actions/bodyweight";
import { getProfile } from "@/app/actions/profile";
import { createServerClient } from "@/lib/supabase/server";
import { getEffectiveWeight, normalizeLoadType } from "@/lib/loadType";
import {
  computeStrengthRanking,
  categoryToStrengthMuscles,
  epleyEstimated1RM,
  getNextRankThreshold,
  getWeightIncreaseSuggestions,
  getTopExercisesByMuscleForSuggestions,
  muscleScoreFromExerciseRatios,
  type StrengthRankingOutput,
  type StrengthRankMuscle,
  type ExerciseDataPoint,
  type WeightIncreaseSuggestion,
  STRENGTH_RANK_MUSCLES,
  PRIMARY_STRENGTH_RANK_MUSCLES,
} from "@/lib/strengthRanking";

export type BestExerciseByMuscle = {
  name: string;
  estimated1RM: number;
};

/** Up to 3 exercises per muscle, sorted by estimated1RM descending (for rank improvement UI). */
export type TopExercisesByMuscle = Record<StrengthRankMuscle, BestExerciseByMuscle[]>;

export type CoreExerciseType = "plank" | "situps" | "hanging_leg_raise" | "weighted";

export type CoreImprovementSuggestion = {
  name: string;
  type: CoreExerciseType;
  /** Display string like "+20 seconds" / "+5 reps" / "+2 kg" */
  improvementLabel: string;
};

export type StrengthRankingWithExercises = StrengthRankingOutput & {
  bestExerciseByMuscle: Record<StrengthRankMuscle, BestExerciseByMuscle | null>;
  /** Top 2–3 exercises per muscle by 1RM (for multi-exercise improvement display). */
  topExercisesByMuscle: TopExercisesByMuscle;
  /** Weight increase suggestions per muscle to reach next rank (multiple paths). */
  improvementSuggestionsByMuscle: Record<StrengthRankMuscle, WeightIncreaseSuggestion[]>;
  /** Which muscles should be shown in the Muscle Strength Rankings UI. */
  visibleMuscles: StrengthRankMuscle[];
  /** Number of exercises that map to each muscle (for empty-state UI). */
  exerciseCountByMuscle: Record<StrengthRankMuscle, number>;
  /** Core-specific “Improve” suggestions (time/reps/weight). */
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

/** Default ranking when user has no workouts, no 1RM data, or no bodyweight: Newbie I. */
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

/** Exercise name → core (auto-map even if category is not Core). */
function exerciseNameMapsToCore(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    n.includes("sit-up") ||
    n.includes("sit up") ||
    n.includes("situp") ||
    n.includes("crunch") ||
    n.includes("plank") ||
    (n.includes("hanging") && (n.includes("leg raise") || n.includes("legraise"))) ||
    n.includes("leg raise") ||
    n.includes("legraise") ||
    n.includes("ab wheel") ||
    n.includes("cable crunch")
  );
}

/** Exercise name → forearms (auto-map even if category is not Forearms). */
function exerciseNameMapsToForearms(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    n.includes("wrist curl") ||
    n.includes("reverse wrist") ||
    n.includes("farmer") ||
    n.includes("plate pinch")
  );
}

function exerciseNameMapsToBiceps(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    n.includes("bicep curl") ||
    n.includes("hammer curl") ||
    n.includes("preacher curl") ||
    n.includes("incline curl") ||
    n.includes("cable curl")
  );
}

function exerciseNameMapsToTriceps(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    n.includes("tricep pushdown") ||
    n.includes("skull crusher") ||
    n.includes("overhead tricep extension") ||
    n.includes("dip") ||
    n.includes("close grip bench")
  );
}

/** Effective strength muscles for an exercise (category + name-based). */
function getEffectiveMusclesForExercise(
  categoryName: string,
  exerciseName: string
): StrengthRankMuscle[] {
  const fromCategory = categoryToStrengthMuscles(categoryName);
  const added: StrengthRankMuscle[] = [];
  if (exerciseNameMapsToCore(exerciseName) && !fromCategory.includes("core")) added.push("core");
  if (exerciseNameMapsToForearms(exerciseName) && !fromCategory.includes("forearms"))
    added.push("forearms");
  if (exerciseNameMapsToBiceps(exerciseName) && !fromCategory.includes("biceps"))
    added.push("biceps");
  if (exerciseNameMapsToTriceps(exerciseName) && !fromCategory.includes("triceps"))
    added.push("triceps");
  const set = new Set<StrengthRankMuscle>([...fromCategory, ...added]);
  return [...set];
}

function normalizeCoreExerciseType(exerciseName: string): CoreExerciseType {
  const n = exerciseName.trim().toLowerCase();
  if (n.includes("plank")) return "plank";
  if (n.includes("sit-up") || n.includes("sit up") || n.includes("situp") || n.includes("crunch"))
    return "situps";
  if (n.includes("hanging") && (n.includes("leg raise") || n.includes("legraise") || n.includes("raise")))
    return "hanging_leg_raise";
  if (n.includes("leg raise") || n.includes("legraise")) return "hanging_leg_raise";
  return "weighted";
}

function coreScoreFromBestPerformance(args: {
  type: CoreExerciseType;
  bestRepsOrSeconds: number;
  bestWeightKg: number;
  bodyweightKg: number;
}): number {
  if (args.type === "plank") {
    return Math.max(0, args.bestRepsOrSeconds) / 110;
  }
  const bw = args.bodyweightKg > 0 ? args.bodyweightKg : 0;
  if (bw <= 0 || args.bestWeightKg <= 0) return 0;
  const reps = Math.max(0, args.bestRepsOrSeconds);
  const oneRm = epleyEstimated1RM(args.bestWeightKg, reps);
  return oneRm / bw;
}

function formatCoreImprovement(
  type: CoreExerciseType,
  bestRepsOrSeconds: number,
  bestWeightKg: number,
  requiredScore: number,
  bodyweightKg: number
): string {
  if (type === "plank") {
    const requiredSeconds = requiredScore * 110;
    const add = Math.max(0, requiredSeconds - bestRepsOrSeconds);
    const rounded = Math.max(5, Math.round(add / 5) * 5);
    return `+${rounded} seconds`;
  }
  const bw = bodyweightKg > 0 ? bodyweightKg : 0;
  if (bw <= 0) return "+0 kg";
  const required1RM = requiredScore * bw;
  const reps = Math.max(0, bestRepsOrSeconds);
  const current1RM = epleyEstimated1RM(bestWeightKg, reps);
  const add = Math.max(0, required1RM - current1RM);
  const rounded = Math.max(1, Math.round(add));
  return `+${rounded} kg`;
}

/** strength_ratio and 1RM for a single set; farmer carry doubles weight only when attributed to forearms. */
function ratioAnd1RmForSet(
  weightKg: number,
  reps: number,
  bodyweightKg: number,
  exerciseName: string,
  targetMuscle: StrengthRankMuscle,
  loadType: unknown
): { ratio: number; estimated1RM: number } | null {
  const bw = bodyweightKg > 0 ? bodyweightKg : 0;
  if (bw <= 0) return null;
  const n = exerciseName.trim().toLowerCase();
  const useFarmerRule = targetMuscle === "forearms" && n.includes("farmer");
  if (useFarmerRule) {
    const effective = weightKg * 2;
    if (reps <= 0) {
      return { ratio: effective / bw, estimated1RM: Math.round(effective * 10) / 10 };
    }
    const oneRm = epleyEstimated1RM(effective, reps);
    return { ratio: oneRm / bw, estimated1RM: Math.round(oneRm * 10) / 10 };
  }
  const effective = getEffectiveWeight(weightKg, loadType);
  const oneRm = epleyEstimated1RM(effective, reps);
  if (oneRm <= 0) return null;
  return { ratio: oneRm / bw, estimated1RM: Math.round(oneRm * 10) / 10 };
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

    const [bodyweightStats, profile] = await Promise.all([
      getBodyweightStats(),
      getProfile(),
    ]);

    const bodyweightKg =
      bodyweightStats.latest?.weight ??
      (profile?.body_weight != null ? profile.body_weight : 0);

    const { data: allExercises } = await supabase
      .from("exercises")
      .select("id, name, category_id, load_type")
      .eq("user_id", user.id);

    if (!allExercises?.length && bodyweightKg <= 0) {
      return { data: defaultStrengthRankingWithExercises() };
    }

    const categoryIds = [...new Set((allExercises ?? []).map((e) => e.category_id))];
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", user.id)
      .in("id", categoryIds);

    const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
    const categoryByExercise: Record<string, string> = {};
    const loadTypeByExercise: Record<string, "bilateral" | "unilateral"> = {};
    for (const e of allExercises ?? []) {
      const name = categoryNameById.get(e.category_id);
      if (name != null) categoryByExercise[e.id] = name;
      loadTypeByExercise[e.id] = normalizeLoadType((e as { load_type?: unknown }).load_type);
    }

    // Fetch all workouts and sets to build exercise data points (with date for recency)
    const { data: workouts } = await supabase
      .from("workouts")
      .select("id, exercise_id, date, weight")
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    const workoutIds = (workouts ?? []).map((w) => w.id);
    const { data: sets } =
      workoutIds.length > 0
        ? await supabase.from("sets").select("workout_id, reps").in("workout_id", workoutIds)
        : { data: [] as { workout_id: string; reps: number }[] };

    const setsByWorkout = new Map<string, number[]>();
    for (const s of sets ?? []) {
      const list = setsByWorkout.get(s.workout_id) ?? [];
      list.push(s.reps);
      setsByWorkout.set(s.workout_id, list);
    }

    const exerciseNameById = new Map((allExercises ?? []).map((e) => [e.id, e.name]));

    const exerciseDataPoints: ExerciseDataPoint[] = [];
    const bwForRatio = bodyweightKg > 0 ? bodyweightKg : 0;
    for (const w of workouts ?? []) {
      const name = exerciseNameById.get(w.exercise_id) ?? "";
      const categoryName = categoryByExercise[w.exercise_id] ?? "";
      const muscles = getEffectiveMusclesForExercise(categoryName, name);
      if (muscles.includes("core")) continue;

      const weightKg = Number(w.weight) || 0;
      const repsList = setsByWorkout.get(w.id) ?? [];
      const loadType = loadTypeByExercise[w.exercise_id] ?? "bilateral";
      for (const reps of repsList) {
        if (bwForRatio <= 0) continue;
        for (const m of muscles) {
          if (m === "core") continue;
          const pair = ratioAnd1RmForSet(weightKg, reps, bwForRatio, name, m, loadType);
          if (!pair) continue;
          exerciseDataPoints.push({
            exerciseId: w.exercise_id,
            exerciseName: name,
            categoryName,
            forMuscle: m,
            estimated1RM: pair.estimated1RM,
            strengthRatio: pair.ratio,
            date: w.date,
          });
        }
      }
    }

    const exerciseCountByMuscle: Record<StrengthRankMuscle, number> = {
      chest: 0,
      back: 0,
      legs: 0,
      shoulders: 0,
      biceps: 0,
      triceps: 0,
      forearms: 0,
      traps: 0,
      core: 0,
    };
    for (const ex of allExercises ?? []) {
      const muscles = getEffectiveMusclesForExercise(categoryByExercise[ex.id] ?? "", ex.name);
      for (const m of muscles) exerciseCountByMuscle[m] += 1;
    }

    // --- Core scoring (special rules) ---
    // Core exercises: category maps to core OR exercise name matches (sit-ups, planks, ab wheel, etc.).
    const coreExerciseIds = (allExercises ?? [])
      .filter((e) =>
        getEffectiveMusclesForExercise(categoryByExercise[e.id] ?? "", e.name).includes("core")
      )
      .map((e) => e.id);

    let coreScore: number | null = null;
    const coreImprovementSuggestions: CoreImprovementSuggestion[] = [];

    if (coreExerciseIds.length > 0) {
      const { data: coreWorkouts } = await supabase
        .from("workouts")
        .select("id, exercise_id, weight")
        .eq("user_id", user.id)
        .in("exercise_id", coreExerciseIds);

      const workoutIds = (coreWorkouts ?? []).map((w) => w.id);
      const { data: coreSets } =
        workoutIds.length > 0
          ? await supabase.from("sets").select("workout_id, reps").in("workout_id", workoutIds)
          : { data: [] as { workout_id: string; reps: number }[] };

      const setsByWorkout = new Map<string, number[]>();
      for (const s of coreSets ?? []) {
        const list = setsByWorkout.get(s.workout_id) ?? [];
        list.push(s.reps);
        setsByWorkout.set(s.workout_id, list);
      }

      const bestByExercise = new Map<
        string,
        { type: CoreExerciseType; bestRepsOrSeconds: number; bestWeightKg: number; score: number; name: string }
      >();

      for (const ex of allExercises ?? []) {
        if (!coreExerciseIds.includes(ex.id)) continue;
        const type = normalizeCoreExerciseType(ex.name);
        bestByExercise.set(ex.id, {
          type,
          bestRepsOrSeconds: 0,
          bestWeightKg: 0,
          score: 0,
          name: ex.name,
        });
      }

      // Compute best performance per exercise from workouts+sets
      for (const w of coreWorkouts ?? []) {
        const current = bestByExercise.get(w.exercise_id);
        if (!current) continue;
        const repsList = setsByWorkout.get(w.id) ?? [];
        const bestSet = repsList.length ? Math.max(...repsList) : 0;
        const weightKg = Number(w.weight) || 0;
        const loadType = loadTypeByExercise[w.exercise_id] ?? "bilateral";
        const effectiveWeightKg = getEffectiveWeight(weightKg, loadType);
        current.bestRepsOrSeconds = Math.max(current.bestRepsOrSeconds, bestSet);
        current.bestWeightKg = Math.max(current.bestWeightKg, effectiveWeightKg);
      }

      const scored = [...bestByExercise.values()].map((v) => {
        const score = coreScoreFromBestPerformance({
          type: v.type,
          bestRepsOrSeconds: v.bestRepsOrSeconds,
          bestWeightKg: v.bestWeightKg,
          bodyweightKg,
        });
        return { ...v, score: Math.round(score * 100) / 100 };
      });

      coreScore = muscleScoreFromExerciseRatios(scored.map((x) => x.score));

      // Improvement suggestions: next rank threshold from lib (same score thresholds as other muscles).
      const nextRankScore = getNextRankThreshold(coreScore ?? 0, "core");
      const requiredScore = nextRankScore ?? coreScore + 0.15;

      const topExercises = scored
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      for (const ex of topExercises) {
        coreImprovementSuggestions.push({
          name: ex.name,
          type: ex.type,
          improvementLabel: formatCoreImprovement(
            ex.type,
            ex.bestRepsOrSeconds,
            ex.bestWeightKg,
            requiredScore,
            bodyweightKg
          ),
        });
      }
    }

    // Empty state: if user has no core exercises at all, do not show suggestions.
    if (exerciseCountByMuscle.core === 0) {
      coreScore = 0;
      coreImprovementSuggestions.length = 0;
    }

    const output = computeStrengthRanking({
      exerciseDataPoints,
      bodyweightKg: bodyweightKg > 0 ? bodyweightKg : 1,
      coreScore,
    });

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

    // Visibility: Core and Forearms always appear (like chest, back, etc.). Traps only if user has exercises.
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
