/**
 * Single source of truth for strength ranking math (matches Insights / getStrengthRanking).
 * Used by rankings persistence and the Insights server action.
 */

import { getEffectiveWeight, normalizeLoadType } from "@/lib/loadType";
import {
  computeStrengthRanking,
  categoryToStrengthMuscles,
  epleyEstimated1RM,
  getNextRankThreshold,
  muscleScoreFromExerciseRatios,
  type StrengthRankingOutput,
  type StrengthRankMuscle,
  type ExerciseDataPoint,
  STRENGTH_RANK_MUSCLES,
} from "@/lib/strengthRanking";
import { createServerClient } from "@/lib/supabase/server";

export type CoreExerciseType = "plank" | "situps" | "hanging_leg_raise" | "weighted";

export type CoreImprovementSuggestion = {
  name: string;
  type: CoreExerciseType;
  improvementLabel: string;
};

type SupabaseServer = Awaited<ReturnType<typeof createServerClient>>;

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

export type StrengthRankingComputeBundle = {
  bodyweightKg: number;
  output: StrengthRankingOutput;
  exerciseDataPoints: ExerciseDataPoint[];
  exerciseCountByMuscle: Record<StrengthRankMuscle, number>;
  categoryByExercise: Record<string, string>;
  loadTypeByExercise: Record<string, "bilateral" | "unilateral">;
  allExercises: { id: string; name: string; category_id: string; load_type?: unknown }[];
  coreImprovementSuggestions: CoreImprovementSuggestion[];
};

export type StrengthRankingComputeResult =
  | { ok: false; reason: "no_exercises_and_no_bodyweight" }
  | { ok: true; bundle: StrengthRankingComputeBundle };

export type ComputeStrengthRankingBundleOptions = {
  /**
   * Optional ISO date string (YYYY-MM-DD). When provided, only workouts and bodyweight logs
   * on/before this date are considered (ranking "as of" that date).
   */
  endDate?: string;
};

/**
 * Same inputs as Insights: latest bodyweight log → profile weight, muscle mapping, core score, farmer rule.
 * Caller must use a Supabase client whose RLS allows reading this user's rows (typically auth.uid() === userId).
 */
export async function computeStrengthRankingBundleForUser(
  supabase: SupabaseServer,
  userId: string,
  options?: ComputeStrengthRankingBundleOptions
): Promise<StrengthRankingComputeResult> {
  const endDate = options?.endDate;
  const [{ data: profile }, { data: latestBwRows }] = await Promise.all([
    supabase.from("profiles").select("body_weight").eq("id", userId).maybeSingle(),
    (() => {
      const q = supabase
        .from("bodyweight_logs")
        .select("weight")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);
      if (endDate) q.lte("date", endDate);
      return q;
    })(),
  ]);

  const latestLog = latestBwRows?.[0];
  /** As-of-date snapshots must not use current profile weight when no log existed by that date. */
  const bodyweightKgRaw =
    latestLog?.weight != null
      ? Number(latestLog.weight)
      : endDate
        ? 0
        : profile?.body_weight != null
          ? Number(profile.body_weight)
          : 0;

  const { data: allExercises } = await supabase
    .from("exercises")
    .select("id, name, category_id, load_type")
    .eq("user_id", userId);

  if (!allExercises?.length && bodyweightKgRaw <= 0) {
    return { ok: false, reason: "no_exercises_and_no_bodyweight" };
  }

  const categoryIds = [...new Set((allExercises ?? []).map((e) => e.category_id))];
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId)
    .in("id", categoryIds);

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const categoryByExercise: Record<string, string> = {};
  const loadTypeByExercise: Record<string, "bilateral" | "unilateral"> = {};
  for (const e of allExercises ?? []) {
    const catName = categoryNameById.get(e.category_id);
    if (catName != null) categoryByExercise[e.id] = catName;
    loadTypeByExercise[e.id] = normalizeLoadType((e as { load_type?: unknown }).load_type);
  }

  const workoutsQ = supabase
    .from("workouts")
    .select("id, exercise_id, date, weight")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (endDate) workoutsQ.lte("date", endDate);
  const { data: workouts } = await workoutsQ;

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
  const bwForRatio = bodyweightKgRaw > 0 ? bodyweightKgRaw : 0;
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

  const coreExerciseIds = (allExercises ?? [])
    .filter((e) =>
      getEffectiveMusclesForExercise(categoryByExercise[e.id] ?? "", e.name).includes("core")
    )
    .map((e) => e.id);

  let coreScore: number | null = null;
  const coreImprovementSuggestions: CoreImprovementSuggestion[] = [];

  if (coreExerciseIds.length > 0) {
    const coreWorkoutsQ = supabase
      .from("workouts")
      .select("id, exercise_id, weight")
      .eq("user_id", userId)
      .in("exercise_id", coreExerciseIds);
    if (endDate) coreWorkoutsQ.lte("date", endDate);
    const { data: coreWorkouts } = await coreWorkoutsQ;

    const coreWorkoutIds = (coreWorkouts ?? []).map((w) => w.id);
    const { data: coreSets } =
      coreWorkoutIds.length > 0
        ? await supabase.from("sets").select("workout_id, reps").in("workout_id", coreWorkoutIds)
        : { data: [] as { workout_id: string; reps: number }[] };

    const coreSetsByWorkout = new Map<string, number[]>();
    for (const s of coreSets ?? []) {
      const list = coreSetsByWorkout.get(s.workout_id) ?? [];
      list.push(s.reps);
      coreSetsByWorkout.set(s.workout_id, list);
    }

    const bestByExercise = new Map<
      string,
      {
        type: CoreExerciseType;
        bestRepsOrSeconds: number;
        bestWeightKg: number;
        score: number;
        name: string;
      }
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

    for (const w of coreWorkouts ?? []) {
      const current = bestByExercise.get(w.exercise_id);
      if (!current) continue;
      const repsList = coreSetsByWorkout.get(w.id) ?? [];
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
        bodyweightKg: bodyweightKgRaw,
      });
      return { ...v, score: Math.round(score * 100) / 100 };
    });

    coreScore = muscleScoreFromExerciseRatios(scored.map((x) => x.score));

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
          bodyweightKgRaw
        ),
      });
    }
  }

  if (exerciseCountByMuscle.core === 0) {
    coreScore = 0;
    coreImprovementSuggestions.length = 0;
  }

  const output = computeStrengthRanking({
    exerciseDataPoints,
    bodyweightKg: bodyweightKgRaw > 0 ? bodyweightKgRaw : 1,
    coreScore,
  });

  return {
    ok: true,
    bundle: {
      bodyweightKg: bodyweightKgRaw,
      output,
      exerciseDataPoints,
      exerciseCountByMuscle,
      categoryByExercise,
      loadTypeByExercise,
      allExercises: allExercises ?? [],
      coreImprovementSuggestions,
    },
  };
}
