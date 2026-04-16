/**
 * Single source of truth for strength ranking math (matches Insights / getStrengthRanking).
 * Used by rankings persistence and the Insights server action.
 */

import { bodyweightLoadFractionFromCategoryNames } from "@/lib/bodyweightCategoryFraction";
import { loadBodyweightSeriesForUser, resolveBodyweightKgFromLogs } from "@/lib/bodyweightAsOf";
import { getEffectiveWeight, normalizeLoadType, type LoadType } from "@/lib/loadType";
import { sessionEstimated1RMFromSets, type SessionSetRow } from "@/lib/sessionStrength";
import {
  computeStrengthRanking,
  categoryToStrengthMuscles,
  epleyEstimated1RM,
  getNextRankThreshold,
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

/** Top core lifts for Muscle Strength UI (best hold, reps, or estimated 1RM). */
export type CoreTopExerciseForDisplay = {
  exerciseId: string;
  name: string;
  displayEstimated1RM: number;
  isDurationSeconds: boolean;
  isReps: boolean;
  score: number;
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
    n.includes("dead hang") ||
    n.includes("dead-hang") ||
    (n.includes("hanging") && (n.includes("leg raise") || n.includes("legraise"))) ||
    n.includes("leg raise") ||
    n.includes("legraise") ||
    n.includes("knee raise") ||
    n.includes("knee-raise") ||
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

/** Muscles whose strength rank can move from logging this exercise (category + name heuristics). */
export function getStrengthRankMusclesForExercise(
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

/** Union of muscle mappings for every category the exercise belongs to (primary + `exercise_categories`). */
export function getStrengthRankMusclesForExerciseCategories(
  categoryNames: readonly string[],
  exerciseName: string
): StrengthRankMuscle[] {
  const unique = [...new Set(categoryNames.map((c) => c.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return getStrengthRankMusclesForExercise("", exerciseName);
  }
  const merged = new Set<StrengthRankMuscle>();
  for (const cat of unique) {
    for (const m of getStrengthRankMusclesForExercise(cat, exerciseName)) {
      merged.add(m);
    }
  }
  return [...merged];
}

function normalizeCoreExerciseType(exerciseName: string): CoreExerciseType {
  const n = exerciseName.trim().toLowerCase();
  if (n.includes("plank")) return "plank";
  if (n.includes("sit-up") || n.includes("sit up") || n.includes("situp") || n.includes("crunch"))
    return "situps";
  if (n.includes("hanging") && (n.includes("leg raise") || n.includes("legraise") || n.includes("raise")))
    return "hanging_leg_raise";
  if (n.includes("leg raise") || n.includes("legraise")) return "hanging_leg_raise";
  if (n.includes("knee raise") || n.includes("knee-raise")) return "hanging_leg_raise";
  return "weighted";
}

/** Timed / isometric core: seconds in `sets.reps` (or timed load type). */
function isTimedCoreHold(exerciseName: string, loadType: LoadType): boolean {
  if (loadType === "timed") return true;
  const n = exerciseName.trim().toLowerCase();
  if (n.includes("plank")) return true;
  if (n.includes("dead hang") || n.includes("dead-hang")) return true;
  return false;
}

/**
 * Bodyweight rep core: dynamic reps (sit-ups, raises, etc.). Excludes holds, timed, and loaded cable/weighted patterns.
 */
function isBodyweightRepCore(
  exerciseName: string,
  loadType: LoadType,
  coreType: CoreExerciseType
): boolean {
  if (isTimedCoreHold(exerciseName, loadType)) return false;
  if (coreType === "weighted") return false;
  if (loadType === "bodyweight") return true;
  if (coreType === "situps" || coreType === "hanging_leg_raise") return true;
  return false;
}

/** Bodyweight rep volume: each rep counts this many points toward core endurance score. */
const CORE_REP_VOLUME_POINTS_PER_REP = 7;

/** Maps strength ratio to pseudo-seconds for sorting/display of weighted core only (cap 240s). */
const CORE_NON_PLANK_RATIO_TO_SECONDS = 100;

function coreScoreFromBestPerformance(args: {
  type: CoreExerciseType;
  bestRepsOrSeconds: number;
  bestWeightKg: number;
  bodyweightKg: number;
}): number {
  if (args.type === "plank") {
    // Best hold (seconds); timed planks store seconds in sets.reps.
    return Math.max(0, args.bestRepsOrSeconds);
  }
  const bw = args.bodyweightKg > 0 ? args.bodyweightKg : 0;
  if (bw <= 0 || args.bestWeightKg <= 0) return 0;
  const reps = Math.max(0, args.bestRepsOrSeconds);
  const oneRm = epleyEstimated1RM(args.bestWeightKg, reps);
  const ratio = oneRm / bw;
  return Math.min(240, Math.round(ratio * CORE_NON_PLANK_RATIO_TO_SECONDS * 100) / 100);
}

/**
 * Next-rank target is total core volume (seconds + points-per-rep × reps) per CORE_VOLUME_STEPS.
 */
function formatCoreImprovementComposite(args: {
  type: CoreExerciseType;
  exerciseName: string;
  loadType: LoadType;
  nextVolumeThreshold: number;
  bestTimedGlobal: number;
  bestRepsGlobal: number;
}): string {
  const currentVol =
    args.bestTimedGlobal + CORE_REP_VOLUME_POINTS_PER_REP * args.bestRepsGlobal;
  const gap = Math.max(0, args.nextVolumeThreshold - currentVol);
  const timedHold =
    args.type === "plank" || args.loadType === "timed" || isTimedCoreHold(args.exerciseName, args.loadType);
  const repCore = isBodyweightRepCore(args.exerciseName, args.loadType, args.type);

  if (timedHold) {
    const needSecs = gap;
    if (needSecs <= 0) return "+0 seconds";
    const rounded = Math.max(1, Math.round(needSecs / 5) * 5);
    return `+${rounded} seconds`;
  }

  if (repCore) {
    const needReps = Math.ceil(gap / CORE_REP_VOLUME_POINTS_PER_REP);
    if (needReps <= 0) return "+0 reps";
    const rounded = Math.max(1, needReps);
    return `+${rounded} reps`;
  }

  return gap <= 0 ? "+0" : `+${Math.max(1, Math.round(gap))} volume`;
}

/** Core endurance volume: best hold seconds + (CORE_REP_VOLUME_POINTS_PER_REP × best bodyweight reps). */
function coreVolumeScoreFromBests(bestTimed: number, bestReps: number): number {
  const timedVol = Math.max(0, bestTimed);
  const repVol = Math.max(0, bestReps) * CORE_REP_VOLUME_POINTS_PER_REP;
  const raw = timedVol + repVol;
  return Math.round(raw * 100) / 100;
}

export type StrengthRankingComputeBundle = {
  bodyweightKg: number;
  output: StrengthRankingOutput;
  exerciseDataPoints: ExerciseDataPoint[];
  exerciseCountByMuscle: Record<StrengthRankMuscle, number>;
  /** Primary category display name per exercise (legacy / single label). */
  categoryByExercise: Record<string, string>;
  /** All category labels for each exercise (primary + `exercise_categories`). */
  categoryNamesByExercise: Record<string, string[]>;
  loadTypeByExercise: Record<string, LoadType>;
  allExercises: { id: string; name: string; category_id: string; load_type?: unknown }[];
  coreImprovementSuggestions: CoreImprovementSuggestion[];
  coreTopExercisesForDisplay: CoreTopExerciseForDisplay[];
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

  const exerciseIds = (allExercises ?? []).map((e) => e.id);
  const { data: exerciseCategoryMappings } =
    exerciseIds.length > 0
      ? await supabase
          .from("exercise_categories")
          .select("exercise_id, category_id")
          .in("exercise_id", exerciseIds)
      : { data: [] as { exercise_id: string; category_id: string }[] };

  const categoryIds = [
    ...new Set([
      ...(allExercises ?? []).map((e) => e.category_id),
      ...(exerciseCategoryMappings ?? []).map((m) => m.category_id),
    ]),
  ];
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId)
    .in("id", categoryIds);

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const categoryNamesByExerciseId = new Map<string, string[]>();
  const pushCategoryName = (exerciseId: string, rawName: string | null | undefined) => {
    const n = (rawName ?? "").trim();
    if (!n) return;
    const list = categoryNamesByExerciseId.get(exerciseId) ?? [];
    if (!list.includes(n)) list.push(n);
    categoryNamesByExerciseId.set(exerciseId, list);
  };

  for (const e of allExercises ?? []) {
    pushCategoryName(e.id, categoryNameById.get(e.category_id));
  }
  for (const m of exerciseCategoryMappings ?? []) {
    pushCategoryName(m.exercise_id, categoryNameById.get(m.category_id));
  }

  const categoryByExercise: Record<string, string> = {};
  const categoryNamesByExercise: Record<string, string[]> = {};
  const loadTypeByExercise: Record<string, LoadType> = {};
  for (const e of allExercises ?? []) {
    const names = categoryNamesByExerciseId.get(e.id) ?? [];
    const primary = categoryNameById.get(e.category_id);
    categoryNamesByExercise[e.id] = names;
    categoryByExercise[e.id] =
      names.length > 0 ? names.join(" · ") : primary != null ? primary : "";
    loadTypeByExercise[e.id] = normalizeLoadType((e as { load_type?: unknown }).load_type);
  }

  const workoutsQ = supabase
    .from("workouts")
    .select("id, exercise_id, date, weight, estimated_1rm, average_estimated_1rm")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (endDate) workoutsQ.lte("date", endDate);
  const { data: workouts } = await workoutsQ;

  const workoutIds = (workouts ?? []).map((w) => w.id);
  const { data: sets } =
    workoutIds.length > 0
      ? await supabase.from("sets").select("workout_id, reps, weight").in("workout_id", workoutIds)
      : { data: [] as { workout_id: string; reps: number; weight?: number | null }[] };

  const setsByWorkout = new Map<string, { reps: number; weight?: number | null }[]>();
  for (const s of sets ?? []) {
    const list = setsByWorkout.get(s.workout_id) ?? [];
    list.push({ reps: s.reps, weight: (s as { weight?: number | null }).weight ?? null });
    setsByWorkout.set(s.workout_id, list);
  }

  const exerciseNameById = new Map((allExercises ?? []).map((e) => [e.id, e.name]));

  const bwSeries = await loadBodyweightSeriesForUser(supabase, userId, {
    logsEndDateInclusive: endDate,
  });

  const exerciseDataPoints: ExerciseDataPoint[] = [];
  const bwForRatio = bodyweightKgRaw > 0 ? bodyweightKgRaw : 0;
  for (const w of workouts ?? []) {
    const name = exerciseNameById.get(w.exercise_id) ?? "";
    const categoryNamesForEx = categoryNamesByExercise[w.exercise_id] ?? [];
    const categoryName =
      categoryNamesForEx.length > 0 ? categoryNamesForEx.join(" · ") : "";
    const muscles = getStrengthRankMusclesForExerciseCategories(categoryNamesForEx, name);
    if (muscles.includes("core")) continue;

    const loadType = loadTypeByExercise[w.exercise_id] ?? "weight";
    if (loadType === "timed") {
      const timedSets = setsByWorkout.get(w.id) ?? [];
      const bestSeconds = timedSets.length
        ? Math.max(...timedSets.map((s) => Number(s.reps) || 0))
        : 0;
      if (bestSeconds <= 0 || bwForRatio <= 0) continue;
      const strengthRatio = bestSeconds / 60;
      for (const m of muscles) {
        if (m === "core") continue;
        exerciseDataPoints.push({
          exerciseId: w.exercise_id,
          exerciseName: name,
          categoryName,
          forMuscle: m,
          estimated1RM: Math.round(bestSeconds * 10) / 10,
          strengthRatio,
          date: w.date,
          isDurationSeconds: true,
        });
      }
      continue;
    }
    const storedBest =
      (w as { estimated_1rm?: number | null }).estimated_1rm != null
        ? Number((w as { estimated_1rm?: number | null }).estimated_1rm)
        : null;
    const workoutSets = setsByWorkout.get(w.id) ?? [];

    // Use advanced session average when present, otherwise keep legacy best-set tracking.
    // Final fallback (older schema): best-set computed from sets.
    const bwAt =
      loadType === "bodyweight"
        ? resolveBodyweightKgFromLogs(w.date, bwSeries.logsAsc, bwSeries.profileKg)
        : 0;
    const computedBest = sessionEstimated1RMFromSets(
      workoutSets as SessionSetRow[],
      Number(w.weight) || 0,
      loadType,
      loadType === "bodyweight"
        ? {
            userBodyweightKg: bwAt,
            bodyweightLoadFraction: bodyweightLoadFractionFromCategoryNames(categoryNamesForEx),
          }
        : undefined
    );

    const session1RM =
      storedBest != null && Number.isFinite(storedBest) && storedBest > 0 ? storedBest : computedBest;

    if (bwForRatio <= 0 || session1RM <= 0) continue;

    for (const m of muscles) {
      if (m === "core") continue;

      // Farmer carry rule applies only to forearms scoring.
      let avgForMuscle = session1RM;
      if (m === "forearms" && name.trim().toLowerCase().includes("farmer")) {
        const fallback = Number(w.weight) || 0;
        let maxKg = 0;
        for (const s of workoutSets) {
          const baseW =
            s.weight != null && Number.isFinite(Number(s.weight)) ? Number(s.weight) : fallback;
          if (baseW > maxKg) maxKg = baseW;
        }
        if (maxKg > 0) {
          const effective = maxKg * 2;
          let bestRm = 0;
          for (const s of workoutSets) {
            const baseW =
              s.weight != null && Number.isFinite(Number(s.weight)) ? Number(s.weight) : fallback;
            if (baseW !== maxKg) continue;
            const oneRm = epleyEstimated1RM(effective, Number(s.reps) || 0);
            if (oneRm > bestRm) bestRm = oneRm;
          }
          avgForMuscle = bestRm;
        }
      }

      exerciseDataPoints.push({
        exerciseId: w.exercise_id,
        exerciseName: name,
        categoryName,
        forMuscle: m,
        estimated1RM: Math.round(avgForMuscle * 10) / 10,
        strengthRatio: avgForMuscle / bwForRatio,
        date: w.date,
      });
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
    const names = categoryNamesByExercise[ex.id] ?? [];
    const muscles = getStrengthRankMusclesForExerciseCategories(names, ex.name);
    for (const m of muscles) exerciseCountByMuscle[m] += 1;
  }

  const coreExerciseIds = (allExercises ?? [])
    .filter((e) =>
      getStrengthRankMusclesForExerciseCategories(categoryNamesByExercise[e.id] ?? [], e.name).includes(
        "core"
      )
    )
    .map((e) => e.id);

  let coreScore: number | null = null;
  const coreImprovementSuggestions: CoreImprovementSuggestion[] = [];
  let coreTopExercisesForDisplay: CoreTopExerciseForDisplay[] = [];

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

    let bestTimedGlobal = 0;
    let bestRepsGlobal = 0;

    for (const w of coreWorkouts ?? []) {
      const current = bestByExercise.get(w.exercise_id);
      if (!current) continue;
      const repsList = coreSetsByWorkout.get(w.id) ?? [];
      const bestSet = repsList.length ? Math.max(...repsList.map((r) => Number(r) || 0)) : 0;
      const weightKg = Number(w.weight) || 0;
      const loadType = loadTypeByExercise[w.exercise_id] ?? "weight";
      const effectiveWeightKg = getEffectiveWeight(weightKg, loadType);
      current.bestRepsOrSeconds = Math.max(current.bestRepsOrSeconds, bestSet);
      current.bestWeightKg = Math.max(current.bestWeightKg, effectiveWeightKg);

      const exName = current.name;
      const coreType = current.type;
      if (bestSet > 0 && isTimedCoreHold(exName, loadType)) {
        bestTimedGlobal = Math.max(bestTimedGlobal, bestSet);
      }
      if (bestSet > 0 && isBodyweightRepCore(exName, loadType, coreType)) {
        bestRepsGlobal = Math.max(bestRepsGlobal, bestSet);
      }
    }

    const scoredWithIds = [...bestByExercise.entries()].map(([exerciseId, v]) => {
      const lt = loadTypeByExercise[exerciseId] ?? "weight";
      let score: number;
      if (v.bestRepsOrSeconds > 0 && isTimedCoreHold(v.name, lt)) {
        score = Math.round(v.bestRepsOrSeconds * 100) / 100;
      } else if (v.bestRepsOrSeconds > 0 && isBodyweightRepCore(v.name, lt, v.type)) {
        score =
          Math.round(v.bestRepsOrSeconds * CORE_REP_VOLUME_POINTS_PER_REP * 100) / 100;
      } else {
        score = coreScoreFromBestPerformance({
          type: v.type,
          bestRepsOrSeconds: v.bestRepsOrSeconds,
          bestWeightKg: v.bestWeightKg,
          bodyweightKg: bodyweightKgRaw,
        });
      }
      return {
        exerciseId,
        ...v,
        score,
      };
    });

    coreScore = coreVolumeScoreFromBests(bestTimedGlobal, bestRepsGlobal);

    const nextRankScore = getNextRankThreshold(coreScore ?? 0, "core");
    const requiredVolume =
      nextRankScore ?? Math.min(400, Math.max(1, (coreScore ?? 0) + 15));

    const contributesToCoreRank = (x: (typeof scoredWithIds)[number]) => {
      const lt = loadTypeByExercise[x.exerciseId] ?? "weight";
      return (
        (x.bestRepsOrSeconds > 0 && isTimedCoreHold(x.name, lt)) ||
        (x.bestRepsOrSeconds > 0 && isBodyweightRepCore(x.name, lt, x.type))
      );
    };

    const coreRankSortMetric = (x: (typeof scoredWithIds)[number]) => {
      const lt = loadTypeByExercise[x.exerciseId] ?? "weight";
      if (x.bestRepsOrSeconds <= 0) return 0;
      if (isTimedCoreHold(x.name, lt)) return x.bestRepsOrSeconds;
      if (isBodyweightRepCore(x.name, lt, x.type)) {
        return x.bestRepsOrSeconds * CORE_REP_VOLUME_POINTS_PER_REP;
      }
      return 0;
    };

    const topExercises = scoredWithIds
      .filter(contributesToCoreRank)
      .sort((a, b) => coreRankSortMetric(b) - coreRankSortMetric(a))
      .slice(0, 3);

    coreTopExercisesForDisplay = scoredWithIds
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => {
        const lt = loadTypeByExercise[x.exerciseId] ?? "weight";
        let displayEstimated1RM = 0;
        let isDurationSeconds = false;
        let isReps = false;
        if (x.type === "plank" || lt === "timed") {
          displayEstimated1RM = x.bestRepsOrSeconds;
          isDurationSeconds = true;
        } else if (x.type === "situps" || x.type === "hanging_leg_raise") {
          displayEstimated1RM = x.bestRepsOrSeconds;
          isReps = true;
        } else {
          displayEstimated1RM =
            x.bestWeightKg > 0
              ? epleyEstimated1RM(x.bestWeightKg, Math.max(0, x.bestRepsOrSeconds))
              : 0;
        }
        return {
          exerciseId: x.exerciseId,
          name: x.name,
          displayEstimated1RM,
          isDurationSeconds,
          isReps,
          score: x.score,
        };
      });

    for (const ex of topExercises) {
      const lt = loadTypeByExercise[ex.exerciseId] ?? "weight";
      coreImprovementSuggestions.push({
        name: ex.name,
        type: ex.type,
        improvementLabel: formatCoreImprovementComposite({
          type: ex.type,
          exerciseName: ex.name,
          loadType: lt,
          nextVolumeThreshold: requiredVolume,
          bestTimedGlobal,
          bestRepsGlobal,
        }),
      });
    }
  }

  if (exerciseCountByMuscle.core === 0) {
    coreScore = 0;
    coreImprovementSuggestions.length = 0;
    coreTopExercisesForDisplay = [];
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
      categoryNamesByExercise,
      loadTypeByExercise,
      allExercises: allExercises ?? [],
      coreImprovementSuggestions,
      coreTopExercisesForDisplay,
    },
  };
}
