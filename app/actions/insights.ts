"use server";

import { createServerClient } from "@/lib/supabase/server";
import { fetchCategoryNameByExerciseId } from "@/lib/exerciseCategoryMeta";
import { loadBodyweightSeriesForUser, resolveBodyweightKgFromLogs } from "@/lib/bodyweightAsOf";
import { bodyweightLoadFractionFromCategoryName } from "@/lib/bodyweightCategoryFraction";
import { normalizeLoadType, type LoadType } from "@/lib/loadType";
import {
  sessionEstimated1RMFromSets,
  sessionVolumeKgFromSets,
  type SessionSetRow,
  type SessionStrengthContext,
} from "@/lib/sessionStrength";
import { getWeekBounds, getMonthBounds, getMonthBoundsFor, getWeekProgress } from "@/lib/insightsDates";
import { MUSCLE_GROUPS, categoryToMuscle, categoryToMuscleGroups, type MuscleGroup } from "@/lib/muscleMapping";
import {
  MUSCLE_BALANCE_RADAR_ORDER,
  type MuscleBalanceRadarCategoryName,
} from "@/lib/insightsRadar";

async function getLoadTypeByExerciseId(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  exerciseIds: string[]
): Promise<Map<string, LoadType>> {
  if (exerciseIds.length === 0) return new Map();
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, load_type")
    .in("id", exerciseIds);
  return new Map(
    (exercises ?? []).map((e) => [e.id, normalizeLoadType((e as { load_type?: unknown }).load_type)])
  );
}

function bodyweightStrengthContext(
  loadType: LoadType | undefined,
  workoutDate: string,
  series: Awaited<ReturnType<typeof loadBodyweightSeriesForUser>>,
  exerciseCategoryName?: string | null
): SessionStrengthContext | undefined {
  const lt = loadType ?? "weight";
  if (lt !== "bodyweight") return undefined;
  return {
    userBodyweightKg: resolveBodyweightKgFromLogs(workoutDate, series.logsAsc, series.profileKg),
    bodyweightLoadFraction: bodyweightLoadFractionFromCategoryName(exerciseCategoryName ?? ""),
  };
}

export type WeekStats = {
  volume: number;
  /** Number of gym sessions (unique days). */
  workouts: number;
  /** Total exercise entries across those sessions. */
  exercises: number;
  sets: number;
  prs: number;
};

export type PaceStatus = "ahead" | "on_pace" | "behind";

export type WeeklyComparison = {
  thisWeek: WeekStats;
  lastWeek: WeekStats;
  volumePct: number | null;
  workoutsDiff: number;
  exercisesDiff: number;
  setsPct: number | null;
  prsDiff: number;
  /** Progress through current week (0–1). Monday 00:00 = 0. */
  weekProgress: number;
  /** True when last week had no workouts (no comparison baseline). */
  noLastWeekData: boolean;
  /** True when week has just started (e.g. under 2% elapsed). */
  weekJustStarted: boolean;
  /** Pace vs expected-by-now from last week. null when no comparison. */
  paceVolume: PaceStatus | null;
  paceWorkouts: PaceStatus | null;
  paceExercises: PaceStatus | null;
  paceSets: PaceStatus | null;
  pacePrs: PaceStatus | null;
};

async function getWorkoutDaysInRange(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  start: string,
  end: string
): Promise<number> {
  const { data } = await supabase
    .from("workouts")
    .select("date")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end);
  const uniqueDays = new Set((data ?? []).map((w) => w.date));
  return uniqueDays.size;
}

async function getBest1RMInRange(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  exerciseId: string,
  start: string,
  end: string
): Promise<number> {
  const map = await getBest1RMByExerciseInRange(supabase, userId, [exerciseId], start, end);
  return map[exerciseId] ?? 0;
}

/** Batch: best estimated 1RM per exercise in one range (one workouts + one sets query). */
async function getBest1RMByExerciseInRange(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  exerciseIds: string[],
  start: string,
  end: string
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const id of exerciseIds) result[id] = 0;
  if (exerciseIds.length === 0) return result;

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, exercise_id, weight, date, estimated_1rm")
    .eq("user_id", userId)
    .in("exercise_id", exerciseIds)
    .gte("date", start)
    .lte("date", end);
  if (!workouts?.length) return result;
  const loadTypeByExerciseId = await getLoadTypeByExerciseId(supabase, exerciseIds);
  const bwSeries = await loadBodyweightSeriesForUser(supabase, userId);
  const categoryNameByExerciseId = await fetchCategoryNameByExerciseId(supabase, exerciseIds, userId);

  const workoutIds = workouts.map((w) => w.id);
  const { data: sets } = await supabase
    .from("sets")
    .select("workout_id, reps, weight")
    .in("workout_id", workoutIds);
  const setsByWorkout = new Map<string, SessionSetRow[]>();
  for (const s of sets ?? []) {
    const list = setsByWorkout.get(s.workout_id) ?? [];
    list.push({
      reps: Number(s.reps) || 0,
      weight: (s as { weight?: number | null }).weight ?? null,
    });
    setsByWorkout.set(s.workout_id, list);
  }
  for (const w of workouts) {
    let best = result[w.exercise_id] ?? 0;
    const list = setsByWorkout.get(w.id) ?? [];
    const lt = loadTypeByExerciseId.get(w.exercise_id) ?? "weight";
    const stored = (w as { estimated_1rm?: number | null }).estimated_1rm;
    let sessionRm: number;
    if (stored != null && Number.isFinite(Number(stored)) && Number(stored) > 0) {
      sessionRm = Number(stored);
    } else {
      sessionRm = sessionEstimated1RMFromSets(
        list,
        Number(w.weight) || 0,
        lt,
        bodyweightStrengthContext(
          lt,
          String(w.date),
          bwSeries,
          categoryNameByExerciseId.get(w.exercise_id)
        )
      );
    }
    result[w.exercise_id] = Math.max(best, sessionRm);
  }
  return result;
}

function getUpperLowerFromCategorySets(setsPerCategory: Record<string, number>): { upperPct: number; lowerPct: number } {
  let upperSets = 0;
  let lowerSets = 0;
  for (const [cat, count] of Object.entries(setsPerCategory)) {
    const region = classifyCategoryToBodyRegion(cat);
    if (region === "upper") upperSets += count;
    else lowerSets += count;
  }
  const total = upperSets + lowerSets;
  if (total === 0) return { upperPct: 50, lowerPct: 50 };
  return {
    upperPct: Math.round((upperSets / total) * 100),
    lowerPct: Math.round((lowerSets / total) * 100),
  };
}

// --- Top Strength Improvements ---

export type TopStrengthGain = {
  name: string;
  improvementKg: number;
  fromKg?: number;
  toKg?: number;
};

/** All-time biggest strength gains: earliest vs latest estimated 1RM per exercise. Computed once on load.
 * Pass precomputed 1RM data to avoid duplicate fetch when loading with getInsightsInitialData. */
export async function getTopStrengthGainsAllTime(
  precomputed1RM?: Estimated1RMByExercise
): Promise<{
  data: TopStrengthGain[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Not authenticated" };

    const byExercise =
      precomputed1RM ?? (await getAll1RMProgression()).data ?? {};
    const exerciseIds = Object.keys(byExercise).filter(
      (id) => (byExercise[id]?.length ?? 0) >= 2
    );
    if (exerciseIds.length === 0) return { data: [] };

    const { data: exercises } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", exerciseIds)
      .eq("user_id", user.id);
    if (!exercises?.length) return { data: [] };

    const nameById = new Map(exercises.map((e) => [e.id, e.name]));
    const gains: TopStrengthGain[] = [];
    for (const exId of exerciseIds) {
      const points = byExercise[exId] ?? [];
      if (points.length < 2) continue;
      const fromKg = points[0].estimated1RM;
      const toKg = points[points.length - 1].estimated1RM;
      const improvementKg = Math.round((toKg - fromKg) * 10) / 10;
      if (improvementKg <= 0) continue;
      const name = nameById.get(exId) ?? "Unknown";
      gains.push({ name, improvementKg, fromKg, toKg });
    }
    gains.sort((a, b) => b.improvementKg - a.improvementKg);
    return { data: gains.slice(0, 3) };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function getTopStrengthImprovements(range: InsightsRange): Promise<{
  data: TopStrengthGain[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Not authenticated" };

    const { current, previous } = rangeToBounds(range);
    const exerciseIds = await getExerciseIdsInRange(supabase, user.id, current.start, current.end);
    if (exerciseIds.length === 0) return { data: [] };

    const { data: exercises } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", exerciseIds)
      .eq("user_id", user.id);
    if (!exercises?.length) return { data: [] };

    const exIds = exercises.map((e) => e.id);
    const [currBestMap, prevBestMap] = await Promise.all([
      getBest1RMByExerciseInRange(supabase, user.id, exIds, current.start, current.end),
      previous
        ? getBest1RMByExerciseInRange(supabase, user.id, exIds, previous.start, previous.end)
        : Promise.resolve({} as Record<string, number>),
    ]);
    const gains: TopStrengthGain[] = [];
    for (const ex of exercises) {
      const currBest = currBestMap[ex.id] ?? 0;
      const prevBest = previous ? (prevBestMap[ex.id] ?? 0) : 0;
      const improvement = Math.round((currBest - prevBest) * 10) / 10;
      if (improvement > 0) gains.push({ name: ex.name, improvementKg: improvement });
    }
    gains.sort((a, b) => b.improvementKg - a.improvementKg);
    return { data: gains.slice(0, 3) };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

// --- Workout Activity (last 14 days) ---

export type DayActivity = { date: string; exerciseCount: number };

export async function getWorkoutActivityLast14Days(): Promise<{
  data: DayActivity[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Not authenticated" };

    const end = new Date();
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 13);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const { data: workouts } = await supabase
      .from("workouts")
      .select("date, exercise_id")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr);

    const dayToExercises = new Map<string, Set<string>>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      dayToExercises.set(d.toISOString().slice(0, 10), new Set());
    }
    for (const w of workouts ?? []) {
      const set = dayToExercises.get(w.date);
      if (set) set.add(w.exercise_id);
    }
    const data: DayActivity[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = dayToExercises.get(dateStr)?.size ?? 0;
      data.push({ date: dateStr, exerciseCount: count });
    }
    return { data };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

// --- Training Balance ---

export type TrainingBalanceResult = {
  upperPct: number;
  lowerPct: number;
  isBalanced: boolean;
  message: string;
};

export async function getTrainingBalance(range: InsightsRange): Promise<{
  data: TrainingBalanceResult | null;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { current } = rangeToBounds(range);
    const setsPerCategory = await getCategorySetsInRange(supabase, user.id, current.start, current.end);
    const { upperPct, lowerPct } = getUpperLowerFromCategorySets(setsPerCategory);
    const isBalanced = lowerPct >= 30;
    const period =
      range === "this_week"
        ? "this week"
        : range === "last_week"
          ? "last week"
          : range === "this_month"
            ? "this month"
            : "last month";
    const message = isBalanced
      ? "Training distribution is balanced."
      : `Lower body training is low ${period}.`;

    return {
      data: { upperPct, lowerPct, isBalanced, message },
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/** Compare current value to expected (from last week × week progress). Returns pace status. */
function paceStatus(current: number, expected: number): PaceStatus | null {
  if (expected <= 0) return current > 0 ? "ahead" : "on_pace";
  const ratio = current / expected;
  if (ratio >= 1.05) return "ahead";
  if (ratio >= 0.85) return "on_pace";
  return "behind";
}

/** Get week bounds and fetch workouts + sets for both weeks in one flow. */
export async function getWeeklyComparison(): Promise<{
  data: WeeklyComparison | null;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const thisBounds = getWeekBounds(0);
    const lastBounds = getWeekBounds(-1);
    const weekProgress = getWeekProgress();

    const [thisStats, lastStats] = await Promise.all([
      getWeekStats(supabase, user.id, thisBounds.start, thisBounds.end),
      getWeekStats(supabase, user.id, lastBounds.start, lastBounds.end),
    ]);

    const volumePct =
      lastStats.volume > 0
        ? Math.round(((thisStats.volume - lastStats.volume) / lastStats.volume) * 100)
        : null;
    const setsPct =
      lastStats.sets > 0
        ? Math.round(((thisStats.sets - lastStats.sets) / lastStats.sets) * 100)
        : null;

    const noLastWeekData =
      lastStats.workouts === 0 && lastStats.volume === 0 && lastStats.sets === 0;
    const weekJustStarted = weekProgress < 0.02;

    const expectedVolume = lastStats.volume * weekProgress;
    const expectedWorkouts = lastStats.workouts * weekProgress;
    const expectedExercises = lastStats.exercises * weekProgress;
    const expectedSets = lastStats.sets * weekProgress;
    const expectedPrs = lastStats.prs * weekProgress;

    const paceVolume =
      noLastWeekData || weekJustStarted ? null : paceStatus(thisStats.volume, expectedVolume);
    const paceWorkouts =
      noLastWeekData || weekJustStarted ? null : paceStatus(thisStats.workouts, expectedWorkouts);
    const paceExercises =
      noLastWeekData || weekJustStarted ? null : paceStatus(thisStats.exercises, expectedExercises);
    const paceSets =
      noLastWeekData || weekJustStarted ? null : paceStatus(thisStats.sets, expectedSets);
    const pacePrs =
      noLastWeekData || weekJustStarted ? null : paceStatus(thisStats.prs, expectedPrs);

    return {
      data: {
        thisWeek: thisStats,
        lastWeek: lastStats,
        volumePct: volumePct ?? 0,
        workoutsDiff: thisStats.workouts - lastStats.workouts,
        exercisesDiff: thisStats.exercises - lastStats.exercises,
        setsPct: setsPct ?? 0,
        prsDiff: thisStats.prs - lastStats.prs,
        weekProgress,
        noLastWeekData,
        weekJustStarted,
        paceVolume,
        paceWorkouts,
        paceExercises,
        paceSets,
        pacePrs,
      },
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

async function getWeekStats(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  start: string,
  end: string
): Promise<WeekStats> {
  const { data: workouts, error: wError } = await supabase
    .from("workouts")
    .select("id, exercise_id, date, weight")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true });

  if (wError || !workouts?.length) {
    return { volume: 0, workouts: 0, exercises: 0, sets: 0, prs: 0 };
  }

  const workoutIds = workouts.map((w) => w.id);
  const { data: sets, error: sError } = await supabase
    .from("sets")
    .select("workout_id, reps, weight")
    .in("workout_id", workoutIds);

  if (sError) return { volume: 0, workouts: 0, exercises: 0, sets: 0, prs: 0 };
  const setsByWorkout = new Map<string, SessionSetRow[]>();
  for (const s of sets ?? []) {
    const list = setsByWorkout.get(s.workout_id) ?? [];
    list.push({
      reps: Number(s.reps) || 0,
      weight: (s as { weight?: number | null }).weight ?? null,
    });
    setsByWorkout.set(s.workout_id, list);
  }

  let volume = 0;
  let setCount = 0;
  const exerciseIds = [...new Set(workouts.map((w) => w.exercise_id))];
  const loadTypeByExerciseId = await getLoadTypeByExerciseId(supabase, exerciseIds);
  const bwSeries = await loadBodyweightSeriesForUser(supabase, userId);
  const categoryNameByExerciseId = await fetchCategoryNameByExerciseId(supabase, exerciseIds, userId);
  const sessionCount = new Set(workouts.map((w) => w.date)).size;
  const exerciseEntryCount = workouts.length;

  for (const w of workouts) {
    const repsList = setsByWorkout.get(w.id) ?? [];
    setCount += repsList.length;
    const lt = loadTypeByExerciseId.get(w.exercise_id) ?? "weight";
    volume += sessionVolumeKgFromSets(
      repsList,
      Number(w.weight) || 0,
      lt,
      bodyweightStrengthContext(
        lt,
        String(w.date),
        bwSeries,
        categoryNameByExerciseId.get(w.exercise_id)
      )
    );
  }

  const prCount = await countPRsInRange(supabase, userId, exerciseIds, end, workouts, setsByWorkout);

  return {
    volume: Math.round(volume),
    workouts: sessionCount,
    exercises: exerciseEntryCount,
    sets: setCount,
    prs: prCount,
  };
}

async function countPRsInRange(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  exerciseIds: string[],
  rangeEnd: string,
  workoutsInRange: { id: string; exercise_id: string; date: string; weight: number }[],
  setsByWorkout: Map<string, SessionSetRow[]>
): Promise<number> {
  if (exerciseIds.length === 0) return 0;

  const { data: history } = await supabase
    .from("workouts")
    .select("id, exercise_id, date, weight")
    .eq("user_id", userId)
    .in("exercise_id", exerciseIds)
    .lte("date", rangeEnd)
    .order("date", { ascending: true });

  if (!history?.length) return workoutsInRange.length;
  const loadTypeByExerciseId = await getLoadTypeByExerciseId(supabase, exerciseIds);
  const bwSeries = await loadBodyweightSeriesForUser(supabase, userId);
  const categoryNameByExerciseId = await fetchCategoryNameByExerciseId(supabase, exerciseIds, userId);

  const histIds = history.map((h) => h.id);
  const { data: histSets } = await supabase
    .from("sets")
    .select("workout_id, reps, weight")
    .in("workout_id", histIds);

  const histSetsByWorkout = new Map<string, SessionSetRow[]>();
  for (const s of histSets ?? []) {
    const list = histSetsByWorkout.get(s.workout_id) ?? [];
    list.push({
      reps: Number(s.reps) || 0,
      weight: (s as { weight?: number | null }).weight ?? null,
    });
    histSetsByWorkout.set(s.workout_id, list);
  }

  const exerciseBestBefore = new Map<string, number>();
  let prCount = 0;

  for (const h of history) {
    const inRange = workoutsInRange.some((w) => w.id === h.id);
    const repsList = histSetsByWorkout.get(h.id) ?? [];
    const lt = loadTypeByExerciseId.get(h.exercise_id) ?? "weight";
    const best1RM = sessionEstimated1RMFromSets(
      repsList,
      Number(h.weight) || 0,
      lt,
      bodyweightStrengthContext(
        lt,
        String(h.date),
        bwSeries,
        categoryNameByExerciseId.get(h.exercise_id)
      )
    );
    const prev = exerciseBestBefore.get(h.exercise_id) ?? 0;
    if (inRange && best1RM > prev) prCount++;
    exerciseBestBefore.set(h.exercise_id, Math.max(prev, best1RM));
  }

  return prCount;
}

// --- Muscle distribution (for insights text: fixed muscle groups) ---

export type MuscleDistributionPoint = { muscle: MuscleGroup; value: number };
export type MuscleDistribution = {
  current: MuscleDistributionPoint[];
  previous: MuscleDistributionPoint[] | null;
};

// --- Category distribution (for radar: user's categories, active only) ---

export type CategoryDistributionPoint = { category: string; value: number };
export type CategoryDistribution = {
  current: CategoryDistributionPoint[];
  previous: CategoryDistributionPoint[] | null;
};

export type { MuscleBalanceRadarCategoryName } from "@/lib/insightsRadar";

export type MuscleBalanceRadarSegment = {
  category: MuscleBalanceRadarCategoryName;
  /** Total sets attributed to this axis (integer); each logged set counts once, split when a category maps to multiple muscles. */
  sets: number;
  setsPrevious: number | null;
  percentage: number;
  percentagePrevious: number | null;
  topExercises: string[];
};

export type MuscleBalanceRadarDistribution = {
  segments: MuscleBalanceRadarSegment[];
};

export type InsightsRange = "this_week" | "last_week" | "this_month" | "last_month" | "lifetime";

/** Heatmap: sets-based stimulus per muscle, with percentage and exercise names. */
export type MuscleHeatmapPoint = {
  muscle: MuscleGroup;
  sets: number;
  percentage: number;
  exercises: string[];
};

// --- Category → body region (Training Balance) ---
// Keyword-based so user categories like "Legs" are classified. Extensible for Core, Forearms, Full Body later.

const LOWER_BODY_KEYWORDS = [
  "legs",
  "leg",
  "quad",
  "quads",
  "hamstring",
  "hamstrings",
  "glute",
  "glutes",
  "calf",
  "calves",
  "lower body",
  "squat",
  "deadlift",
  "lunge",
  "hip",
  "knee",
  "posterior",
  "hinge",
];

const UPPER_BODY_KEYWORDS = [
  "chest",
  "back",
  "bicep",
  "biceps",
  "tricep",
  "triceps",
  "shoulder",
  "shoulders",
  "lats",
  "lat",
  "upper body",
];

// Future: CORE_KEYWORDS = ["core", "abs", "oblique"], FULL_BODY_KEYWORDS = ["full body"], etc.

type BodyRegion = "upper" | "lower";

/**
 * Classify a category name into upper or lower body using keyword match (case-insensitive).
 * If the category name contains a keyword, it is classified accordingly.
 * Default: upper body (so custom categories are never ignored).
 */
function classifyCategoryToBodyRegion(categoryName: string): BodyRegion {
  const name = categoryName.trim().toLowerCase();
  for (const kw of LOWER_BODY_KEYWORDS) {
    if (name.includes(kw)) return "lower";
  }
  for (const kw of UPPER_BODY_KEYWORDS) {
    if (name.includes(kw)) return "upper";
  }
  return "upper";
}

function rangeToBounds(
  range: InsightsRange
): { current: { start: string; end: string }; previous: { start: string; end: string } | null } {
  switch (range) {
    case "this_week": {
      const c = getWeekBounds(0);
      const p = getWeekBounds(-1);
      return { current: c, previous: p };
    }
    case "last_week": {
      const c = getWeekBounds(-1);
      const p = getWeekBounds(-2);
      return { current: c, previous: p };
    }
    case "this_month": {
      const c = getMonthBounds(0);
      const p = getMonthBounds(-1);
      return { current: c, previous: p };
    }
    case "last_month": {
      const c = getMonthBounds(-1);
      const p = getMonthBounds(-2);
      return { current: c, previous: p };
    }
    case "lifetime": {
      const end = new Date();
      end.setUTCHours(23, 59, 59, 999);
      return {
        current: { start: "2000-01-01", end: end.toISOString().slice(0, 10) },
        previous: null,
      };
    }
  }
}

/** Format category name for display: capitalize, keep short. */
function formatCategoryLabel(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * Category-based distribution for the radar chart.
 * Uses training stimulus = total sets per category (fairer across muscle groups than volume).
 * Values are % of total sets in the period. Only categories with sets in the selected timeframe appear.
 *
 * Future: stimulusScore = sets × intensityFactor × proximityToFailure when RPE/failure is tracked.
 */
export async function getCategoryDistribution(range: InsightsRange): Promise<{
  data: CategoryDistribution | null;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { current, previous } = rangeToBounds(range);

    const [currentSets, previousSets] = await Promise.all([
      getCategorySetsInRange(supabase, user.id, current.start, current.end),
      previous
        ? getCategorySetsInRange(supabase, user.id, previous.start, previous.end)
        : Promise.resolve(null),
    ]);

    const activeCategories = Object.keys(currentSets).filter((cat) => currentSets[cat] > 0);
    if (activeCategories.length === 0) {
      return {
        data: {
          current: [],
          previous: null,
        },
      };
    }

    activeCategories.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    const totalCurrentSets = activeCategories.reduce((sum, cat) => sum + currentSets[cat], 0);
    const currentPct = activeCategories.map((category) => ({
      category: formatCategoryLabel(category),
      value: totalCurrentSets > 0 ? Math.round((currentSets[category] / totalCurrentSets) * 100) : 0,
    }));

    let previousPct: CategoryDistributionPoint[] | null = null;
    if (previousSets) {
      const totalPreviousSets = Object.values(previousSets).reduce((a, b) => a + b, 0);
      previousPct = activeCategories.map((category) => ({
        category: formatCategoryLabel(category),
        value:
          totalPreviousSets > 0
            ? Math.round(((previousSets[category] ?? 0) / totalPreviousSets) * 100)
            : 0,
      }));
    }

    return {
      data: {
        current: currentPct,
        previous: previousPct,
      },
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

/** Set count per category (by name) for the given date range. Only categories with workouts in range appear. */
async function getCategorySetsInRange(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  start: string,
  end: string
): Promise<Record<string, number>> {
  const setsPerCategory: Record<string, number> = {};

  const { data: workouts, error: wError } = await supabase
    .from("workouts")
    .select("id, exercise_id")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end);

  if (wError || !workouts?.length) return setsPerCategory;

  const exerciseIds = [...new Set(workouts.map((w) => w.exercise_id))];
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, category_id")
    .in("id", exerciseIds);

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId);

  const catNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const exerciseToCategoryName = new Map<string, string>();
  for (const e of exercises ?? []) {
    const name = catNameById.get(e.category_id);
    if (name != null) exerciseToCategoryName.set(e.id, name);
  }

  const workoutIds = workouts.map((w) => w.id);
  const { data: sets } = await supabase
    .from("sets")
    .select("workout_id")
    .in("workout_id", workoutIds);

  const setCountByWorkout = new Map<string, number>();
  for (const s of sets ?? []) {
    setCountByWorkout.set(s.workout_id, (setCountByWorkout.get(s.workout_id) ?? 0) + 1);
  }

  for (const w of workouts) {
    const categoryName = exerciseToCategoryName.get(w.exercise_id);
    if (categoryName == null) continue;
    const count = setCountByWorkout.get(w.id) ?? 0;
    setsPerCategory[categoryName] = (setsPerCategory[categoryName] ?? 0) + count;
  }

  return setsPerCategory;
}

const LEG_MUSCLES_FOR_RADAR = new Set<MuscleGroup>(["Quads", "Hamstrings", "Glutes", "Calves"]);

function muscleGroupToRadarCategory(m: MuscleGroup): MuscleBalanceRadarCategoryName | null {
  if (m === "Chest") return "Chest";
  if (m === "Back") return "Back";
  if (m === "Shoulders") return "Shoulders";
  if (m === "Biceps") return "Biceps";
  if (m === "Triceps") return "Triceps";
  if (LEG_MUSCLES_FOR_RADAR.has(m)) return "Legs";
  return null;
}

type MuscleBalanceRadarAccum = {
  setsByCategory: Record<MuscleBalanceRadarCategoryName, number>;
  exerciseScores: Record<MuscleBalanceRadarCategoryName, Map<string, number>>;
};

function emptyMuscleBalanceRadarAccum(): MuscleBalanceRadarAccum {
  const setsByCategory = {} as Record<MuscleBalanceRadarCategoryName, number>;
  const exerciseScores = {} as Record<MuscleBalanceRadarCategoryName, Map<string, number>>;
  for (const c of MUSCLE_BALANCE_RADAR_ORDER) {
    setsByCategory[c] = 0;
    exerciseScores[c] = new Map();
  }
  return { setsByCategory, exerciseScores };
}

function topExerciseNamesForRadar(scores: Map<string, number>, limit: number): string[] {
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v >= 0.5)
    .slice(0, limit)
    .map(([name]) => name);
}

/**
 * Sum of logged sets per radar muscle axis for a date range.
 * Each row in `sets` counts as one set. Categories mapping to multiple muscles split that workout's sets evenly.
 */
async function getMuscleBalanceRadarAccumForBounds(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  start: string,
  end: string
): Promise<MuscleBalanceRadarAccum> {
  const out = emptyMuscleBalanceRadarAccum();

  const { data: workouts, error: wError } = await supabase
    .from("workouts")
    .select("id, exercise_id")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end);

  if (wError || !workouts?.length) return out;

  const exerciseIds = [...new Set(workouts.map((w) => w.exercise_id))];
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, category_id")
    .in("id", exerciseIds);

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId);

  const catNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const exerciseToCategoryName = new Map<string, string>();
  const exerciseNameById = new Map<string, string>();
  for (const e of exercises ?? []) {
    const name = catNameById.get(e.category_id);
    if (name != null) exerciseToCategoryName.set(e.id, name);
    exerciseNameById.set(e.id, e.name);
  }

  const workoutIds = workouts.map((w) => w.id);
  const { data: setsRows } = await supabase.from("sets").select("workout_id").in("workout_id", workoutIds);

  const setCountByWorkout = new Map<string, number>();
  for (const s of setsRows ?? []) {
    setCountByWorkout.set(s.workout_id, (setCountByWorkout.get(s.workout_id) ?? 0) + 1);
  }

  for (const w of workouts) {
    const categoryName = exerciseToCategoryName.get(w.exercise_id);
    if (categoryName == null) continue;
    const muscles = categoryToMuscleGroups(categoryName);
    if (muscles.length === 0) continue;
    const nSets = setCountByWorkout.get(w.id) ?? 0;
    if (nSets === 0) continue;
    const share = nSets / muscles.length;
    const exName = exerciseNameById.get(w.exercise_id) ?? "Unknown";

    for (const m of muscles) {
      const rc = muscleGroupToRadarCategory(m);
      if (rc == null) continue;
      out.setsByCategory[rc] += share;
      const map = out.exerciseScores[rc];
      map.set(exName, (map.get(exName) ?? 0) + share);
    }
  }

  return out;
}

function buildMuscleBalanceRadarDistribution(
  current: MuscleBalanceRadarAccum,
  previous: MuscleBalanceRadarAccum | null
): MuscleBalanceRadarDistribution {
  const totalC = MUSCLE_BALANCE_RADAR_ORDER.reduce((s, c) => s + current.setsByCategory[c], 0);
  const totalP =
    previous != null
      ? MUSCLE_BALANCE_RADAR_ORDER.reduce((s, c) => s + previous.setsByCategory[c], 0)
      : 0;

  const segments: MuscleBalanceRadarSegment[] = MUSCLE_BALANCE_RADAR_ORDER.map((category) => {
    const sets = Math.round(current.setsByCategory[category]);
    const setsPrevious = previous != null ? Math.round(previous.setsByCategory[category]) : null;
    const percentage =
      totalC > 0 ? Math.round((current.setsByCategory[category] / totalC) * 100) : 0;
    const percentagePrevious =
      previous != null
        ? totalP > 0
          ? Math.round((previous.setsByCategory[category] / totalP) * 100)
          : 0
        : null;
    return {
      category,
      sets,
      setsPrevious,
      percentage,
      percentagePrevious,
      topExercises: topExerciseNamesForRadar(current.exerciseScores[category], 5),
    };
  });

  return { segments };
}

export async function getMuscleBalanceRadarData(range: InsightsRange): Promise<{
  data: MuscleBalanceRadarDistribution | null;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { current, previous } = rangeToBounds(range);
    const [curAcc, prevAcc] = await Promise.all([
      getMuscleBalanceRadarAccumForBounds(supabase, user.id, current.start, current.end),
      previous
        ? getMuscleBalanceRadarAccumForBounds(supabase, user.id, previous.start, previous.end)
        : Promise.resolve(null),
    ]);

    return {
      data: buildMuscleBalanceRadarDistribution(curAcc, prevAcc),
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

export async function getMuscleDistribution(range: InsightsRange): Promise<{
  data: MuscleDistribution | null;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { current, previous } = rangeToBounds(range);

    const [currentVol, previousVol] = await Promise.all([
      getMuscleVolumeInRange(supabase, user.id, current.start, current.end),
      previous
        ? getMuscleVolumeInRange(supabase, user.id, previous.start, previous.end)
        : Promise.resolve(null),
    ]);

    const currentPct = toPercentages(currentVol);
    const previousPct = previousVol ? toPercentages(previousVol) : null;

    return {
      data: {
        current: MUSCLE_GROUPS.map((m) => ({ muscle: m, value: currentPct[m] ?? 0 })),
        previous: previousPct
          ? MUSCLE_GROUPS.map((m) => ({ muscle: m, value: previousPct[m] ?? 0 }))
          : null,
      },
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

async function getMuscleVolumeInRange(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  start: string,
  end: string
): Promise<Record<MuscleGroup, number>> {
  const vol: Record<MuscleGroup, number> = {} as Record<MuscleGroup, number>;
  for (const m of MUSCLE_GROUPS) vol[m] = 0;

  const { data: workouts, error: wError } = await supabase
    .from("workouts")
    .select("id, exercise_id, weight, date")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end);

  if (wError || !workouts?.length) return vol;

  const exerciseIds = [...new Set(workouts.map((w) => w.exercise_id))];
  const loadTypeByExerciseId = await getLoadTypeByExerciseId(supabase, exerciseIds);
  const bwSeries = await loadBodyweightSeriesForUser(supabase, userId);
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, category_id")
    .in("id", exerciseIds);

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId);

  const catNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const exerciseToMuscle = new Map<string, MuscleGroup>();
  const exerciseToCategoryName = new Map<string, string>();
  for (const e of exercises ?? []) {
    const name = catNameById.get(e.category_id);
    if (name) {
      exerciseToCategoryName.set(e.id as string, name);
      const muscle = categoryToMuscle(name);
      if (muscle) exerciseToMuscle.set(e.id, muscle);
    }
  }

  const workoutIds = workouts.map((w) => w.id);
  const { data: sets } = await supabase
    .from("sets")
    .select("workout_id, reps, weight")
    .in("workout_id", workoutIds);

  const setsByWorkout = new Map<string, SessionSetRow[]>();
  for (const s of sets ?? []) {
    const list = setsByWorkout.get(s.workout_id) ?? [];
    list.push({
      reps: Number(s.reps) || 0,
      weight: (s as { weight?: number | null }).weight ?? null,
    });
    setsByWorkout.set(s.workout_id, list);
  }

  for (const w of workouts) {
    const muscle = exerciseToMuscle.get(w.exercise_id);
    if (!muscle) continue;
    const repsList = setsByWorkout.get(w.id) ?? [];
    const lt = loadTypeByExerciseId.get(w.exercise_id) ?? "weight";
    vol[muscle] += sessionVolumeKgFromSets(
      repsList,
      Number(w.weight) || 0,
      lt,
      bodyweightStrengthContext(
        lt,
        String(w.date),
        bwSeries,
        exerciseToCategoryName.get(w.exercise_id)
      )
    );
  }

  return vol;
}

function toPercentages(vol: Record<MuscleGroup, number>): Record<MuscleGroup, number> {
  const total = Object.values(vol).reduce((a, b) => a + b, 0);
  if (total === 0) return { ...vol };
  const out = {} as Record<MuscleGroup, number>;
  for (const m of MUSCLE_GROUPS) {
    out[m] = Math.round((vol[m] / total) * 100);
  }
  return out;
}

// --- Muscle heatmap (sets-based, all 10 muscle groups) ---

/** Sets per muscle and unique exercise names per muscle for a date range. */
async function getMuscleSetsAndExercisesInRange(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  start: string,
  end: string
): Promise<{ setsPerMuscle: Record<MuscleGroup, number>; exercisesPerMuscle: Record<MuscleGroup, string[]> }> {
  const setsPerMuscle: Record<MuscleGroup, number> = {} as Record<MuscleGroup, number>;
  const exercisesPerMuscle: Record<MuscleGroup, Set<string>> = {} as Record<MuscleGroup, Set<string>>;
  for (const m of MUSCLE_GROUPS) {
    setsPerMuscle[m] = 0;
    exercisesPerMuscle[m] = new Set();
  }

  const { data: workouts, error: wError } = await supabase
    .from("workouts")
    .select("id, exercise_id, weight, date")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end);

  if (wError || !workouts?.length) {
    const emptyExercises: Record<MuscleGroup, string[]> = {} as Record<MuscleGroup, string[]>;
    for (const m of MUSCLE_GROUPS) emptyExercises[m] = [];
    return { setsPerMuscle, exercisesPerMuscle: emptyExercises };
  }

  const exerciseIds = [...new Set(workouts.map((w) => w.exercise_id))];
  const loadTypeByExerciseId = await getLoadTypeByExerciseId(supabase, exerciseIds);
  const bwSeries = await loadBodyweightSeriesForUser(supabase, userId);
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, category_id")
    .in("id", exerciseIds);

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId);

  const catNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const exerciseToCategoryName = new Map<string, string>();
  const exerciseNameById = new Map<string, string>();
  for (const e of exercises ?? []) {
    const name = catNameById.get(e.category_id);
    if (name != null) exerciseToCategoryName.set(e.id, name);
    exerciseNameById.set(e.id, e.name);
  }

  const workoutIds = workouts.map((w) => w.id);
  const { data: sets } = await supabase
    .from("sets")
    .select("workout_id, reps, weight")
    .in("workout_id", workoutIds);

  const setsByWorkout = new Map<string, SessionSetRow[]>();
  for (const s of sets ?? []) {
    const list = setsByWorkout.get(s.workout_id) ?? [];
    list.push({
      reps: Number(s.reps) || 0,
      weight: (s as { weight?: number | null }).weight ?? null,
    });
    setsByWorkout.set(s.workout_id, list);
  }

  for (const w of workouts) {
    const categoryName = exerciseToCategoryName.get(w.exercise_id);
    if (categoryName == null) continue;
    const list = setsByWorkout.get(w.id) ?? [];
    const lt = loadTypeByExerciseId.get(w.exercise_id) ?? "weight";
    const vol = sessionVolumeKgFromSets(
      list,
      Number(w.weight) || 0,
      lt,
      bodyweightStrengthContext(
        lt,
        String(w.date),
        bwSeries,
        exerciseToCategoryName.get(w.exercise_id)
      )
    );
    if (vol <= 0) continue;
    const muscles = categoryToMuscleGroups(categoryName);
    if (muscles.length === 0) continue;
    const share = vol / muscles.length;
    const exerciseName = exerciseNameById.get(w.exercise_id) ?? "Unknown";
    for (const m of muscles) {
      setsPerMuscle[m] = (setsPerMuscle[m] ?? 0) + share;
      exercisesPerMuscle[m].add(exerciseName);
    }
  }

  const exercisesPerMuscleArr: Record<MuscleGroup, string[]> = {} as Record<MuscleGroup, string[]>;
  for (const m of MUSCLE_GROUPS) {
    exercisesPerMuscleArr[m] = [...exercisesPerMuscle[m]].sort();
  }
  return { setsPerMuscle, exercisesPerMuscle: exercisesPerMuscleArr };
}

export async function getMuscleHeatmapData(range: InsightsRange): Promise<{
  data: MuscleHeatmapPoint[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Not authenticated" };

    const { current } = rangeToBounds(range);
    const { setsPerMuscle, exercisesPerMuscle } = await getMuscleSetsAndExercisesInRange(
      supabase,
      user.id,
      current.start,
      current.end
    );

    const totalSets = Object.values(setsPerMuscle).reduce((a, b) => a + b, 0);
    const points: MuscleHeatmapPoint[] = MUSCLE_GROUPS.map((muscle) => {
      const sets = Math.round(setsPerMuscle[muscle] * 10) / 10;
      const percentage = totalSets > 0 ? Math.round((setsPerMuscle[muscle] / totalSets) * 100) : 0;
      return {
        muscle,
        sets,
        percentage,
        exercises: exercisesPerMuscle[muscle] ?? [],
      };
    });

    return { data: points };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

// --- 1RM progression ---

export type OneRMPoint = { date: string; estimated1RM: number };

/**
 * Precomputed 1RM progression for all exercises (full history).
 * Client filters by range (30/90/all) for display.
 */
export type Estimated1RMByExercise = Record<string, OneRMPoint[]>;

/** Fetches workouts + sets once and builds 1RM progression per exercise. Single pass. */
export async function getAll1RMProgression(): Promise<{
  data: Estimated1RMByExercise;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: {}, error: "Not authenticated" };

    const { data: workouts, error: wError } = await supabase
      .from("workouts")
      .select("id, exercise_id, date, weight, estimated_1rm")
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (wError) return { data: {}, error: wError.message };
    if (!workouts?.length) return { data: {} };

    const workoutIds = workouts.map((w) => w.id);
    const { data: sets, error: sError } = await supabase
      .from("sets")
      .select("workout_id, reps, weight")
      .in("workout_id", workoutIds);

    if (sError) return { data: {}, error: sError.message };
    const allExerciseIds = [...new Set(workouts.map((w) => w.exercise_id))];
    const loadTypeByExerciseId = await getLoadTypeByExerciseId(supabase, allExerciseIds);
    const bwSeries = await loadBodyweightSeriesForUser(supabase, user.id);
    const categoryNameByExerciseId = await fetchCategoryNameByExerciseId(
      supabase,
      allExerciseIds,
      user.id
    );
    const setsByWorkout = new Map<string, SessionSetRow[]>();
    for (const s of sets ?? []) {
      const list = setsByWorkout.get(s.workout_id) ?? [];
      list.push({
        reps: Number(s.reps) || 0,
        weight: (s as { weight?: number | null }).weight ?? null,
      });
      setsByWorkout.set(s.workout_id, list);
    }

    const byExercise: Estimated1RMByExercise = {};
    for (const w of workouts) {
      const repsList = setsByWorkout.get(w.id) ?? [];
      const lt = loadTypeByExerciseId.get(w.exercise_id) ?? "weight";
      const stored = (w as { estimated_1rm?: number | null }).estimated_1rm;
      const best =
        stored != null && Number.isFinite(Number(stored)) && Number(stored) > 0
          ? Number(stored)
          : sessionEstimated1RMFromSets(
              repsList,
              Number(w.weight) || 0,
              lt,
              bodyweightStrengthContext(
                lt,
                String(w.date),
                bwSeries,
                categoryNameByExerciseId.get(w.exercise_id)
              )
            );
      if (best > 0) {
        const points = byExercise[w.exercise_id] ?? [];
        points.push({ date: w.date, estimated1RM: Math.round(best * 10) / 10 });
        byExercise[w.exercise_id] = points;
      }
    }
    return { data: byExercise };
  } catch (e) {
    return {
      data: {},
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

export async function get1RMProgression(
  exerciseId: string,
  range: "30" | "90" | "all"
): Promise<{ data: OneRMPoint[]; error?: string }> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Not authenticated" };

    let start: string | undefined;
    if (range === "30") {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - 30);
      start = d.toISOString().slice(0, 10);
    } else if (range === "90") {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - 90);
      start = d.toISOString().slice(0, 10);
    }
    const q = supabase
      .from("workouts")
      .select("id, date, weight, estimated_1rm")
      .eq("user_id", user.id)
      .eq("exercise_id", exerciseId)
      .order("date", { ascending: true });
    if (start) q.gte("date", start);

    const { data: workouts, error: wError } = await q;
    if (wError) return { data: [], error: wError.message };
    if (!workouts?.length) return { data: [] };

    const workoutIds = workouts.map((w) => w.id);
    const { data: sets, error: sError } = await supabase
      .from("sets")
      .select("workout_id, reps, weight")
      .in("workout_id", workoutIds);

    if (sError) return { data: [], error: sError.message };
    const loadTypeByExerciseId = await getLoadTypeByExerciseId(supabase, [exerciseId]);
    const bwSeries = await loadBodyweightSeriesForUser(supabase, user.id);
    const categoryNameByExerciseId = await fetchCategoryNameByExerciseId(
      supabase,
      [exerciseId],
      user.id
    );
    const setsByWorkout = new Map<string, SessionSetRow[]>();
    for (const s of sets ?? []) {
      const list = setsByWorkout.get(s.workout_id) ?? [];
      list.push({
        reps: Number(s.reps) || 0,
        weight: (s as { weight?: number | null }).weight ?? null,
      });
      setsByWorkout.set(s.workout_id, list);
    }

    const points: OneRMPoint[] = [];
    for (const w of workouts) {
      const repsList = setsByWorkout.get(w.id) ?? [];
      const lt = loadTypeByExerciseId.get(exerciseId) ?? "weight";
      const stored = (w as { estimated_1rm?: number | null }).estimated_1rm;
      const best =
        stored != null && Number.isFinite(Number(stored)) && Number(stored) > 0
          ? Number(stored)
          : sessionEstimated1RMFromSets(
              repsList,
              Number(w.weight) || 0,
              lt,
              bodyweightStrengthContext(
                lt,
                String(w.date),
                bwSeries,
                categoryNameByExerciseId.get(exerciseId)
              )
            );
      if (best > 0) points.push({ date: w.date, estimated1RM: Math.round(best * 10) / 10 });
    }

    return { data: points };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

// --- Monthly summary ---

export type MonthlySummary = {
  volumeChangePct: number | null;
  workoutsCompleted: number;
  prsHit: number;
  topImproved: { muscle: MuscleGroup; changePct: number }[];
};

export async function getMonthlySummary(): Promise<{
  data: MonthlySummary | null;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const thisMonth = getMonthBounds(0);
    const lastMonth = getMonthBounds(-1);

    const [thisVol, lastVol, thisStats, thisMuscle, lastMuscle] = await Promise.all([
      getTotalVolumeInRange(supabase, user.id, thisMonth.start, thisMonth.end),
      getTotalVolumeInRange(supabase, user.id, lastMonth.start, lastMonth.end),
      getWeekStats(supabase, user.id, thisMonth.start, thisMonth.end),
      getMuscleVolumeInRange(supabase, user.id, thisMonth.start, thisMonth.end),
      getMuscleVolumeInRange(supabase, user.id, lastMonth.start, lastMonth.end),
    ]);

    const volumeChangePct =
      lastVol > 0 ? Math.round(((thisVol - lastVol) / lastVol) * 100) : null;

    const topImproved: { muscle: MuscleGroup; changePct: number }[] = [];
    for (const m of MUSCLE_GROUPS) {
      const prev = lastMuscle[m] ?? 0;
      const curr = thisMuscle[m] ?? 0;
      if (prev > 0) {
        const pct = Math.round(((curr - prev) / prev) * 100);
        if (pct > 0) topImproved.push({ muscle: m, changePct: pct });
      }
    }
    topImproved.sort((a, b) => b.changePct - a.changePct);

    const prCount = await countPRsInRange(
      supabase,
      user.id,
      await getExerciseIdsInRange(supabase, user.id, thisMonth.start, thisMonth.end),
      thisMonth.end,
      await getWorkoutsInRange(supabase, user.id, thisMonth.start, thisMonth.end),
      await getSetsByWorkoutInRange(supabase, user.id, thisMonth.start, thisMonth.end)
    );

    return {
      data: {
        volumeChangePct,
        workoutsCompleted: thisStats.workouts,
        prsHit: prCount,
        topImproved: topImproved.slice(0, 5),
      },
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

async function getTotalVolumeInRange(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  start: string,
  end: string
): Promise<number> {
  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, weight, exercise_id, date")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end);
  if (!workouts?.length) return 0;
  const exerciseIds = [...new Set(workouts.map((w) => w.exercise_id))];
  const loadTypeByExerciseId = await getLoadTypeByExerciseId(supabase, exerciseIds);
  const bwSeries = await loadBodyweightSeriesForUser(supabase, userId);
  const categoryNameByExerciseId = await fetchCategoryNameByExerciseId(supabase, exerciseIds, userId);
  const ids = workouts.map((w) => w.id);
  const { data: sets } = await supabase
    .from("sets")
    .select("workout_id, reps, weight")
    .in("workout_id", ids);
  const byW = new Map<string, SessionSetRow[]>();
  for (const s of sets ?? []) {
    const list = byW.get(s.workout_id) ?? [];
    list.push({
      reps: Number(s.reps) || 0,
      weight: (s as { weight?: number | null }).weight ?? null,
    });
    byW.set(s.workout_id, list);
  }
  let v = 0;
  for (const w of workouts) {
    const lt = loadTypeByExerciseId.get(w.exercise_id) ?? "weight";
    v += sessionVolumeKgFromSets(
      byW.get(w.id) ?? [],
      Number(w.weight) || 0,
      lt,
      bodyweightStrengthContext(
        lt,
        String(w.date),
        bwSeries,
        categoryNameByExerciseId.get(w.exercise_id)
      )
    );
  }
  return v;
}

async function getExerciseIdsInRange(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  start: string,
  end: string
): Promise<string[]> {
  const { data } = await supabase
    .from("workouts")
    .select("exercise_id")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end);
  return [...new Set((data ?? []).map((w) => w.exercise_id))];
}

async function getWorkoutsInRange(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  start: string,
  end: string
) {
  const { data } = await supabase
    .from("workouts")
    .select("id, exercise_id, date, weight")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end);
  return data ?? [];
}

async function getSetsByWorkoutInRange(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  start: string,
  end: string
): Promise<Map<string, SessionSetRow[]>> {
  const { data: workouts } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end);
  if (!workouts?.length) return new Map();
  const ids = workouts.map((w) => w.id);
  const { data: sets } = await supabase
    .from("sets")
    .select("workout_id, reps, weight")
    .in("workout_id", ids);
  const byW = new Map<string, SessionSetRow[]>();
  for (const s of sets ?? []) {
    const list = byW.get(s.workout_id) ?? [];
    list.push({
      reps: Number(s.reps) || 0,
      weight: (s as { weight?: number | null }).weight ?? null,
    });
    byW.set(s.workout_id, list);
  }
  return byW;
}

// --- Monthly analytics (selectable month) ---

export type MonthOption = { year: number; month: number };

/** Month is 1-based (1 = January). Returns list of months that have at least one workout, newest first. */
export async function getMonthsWithWorkoutData(): Promise<{
  data: MonthOption[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Not authenticated" };

    const { data: workouts } = await supabase
      .from("workouts")
      .select("date")
      .eq("user_id", user.id);
    const seen = new Set<string>();
    for (const w of workouts ?? []) {
      const [y, m] = w.date.split("-").map(Number);
      seen.add(`${y}-${m}`);
    }
    const options: MonthOption[] = [...seen]
      .map((key) => {
        const [y, m] = key.split("-").map(Number);
        return { year: y, month: m };
      })
      .sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));
    const now = new Date();
    const current = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
    if (!options.some((o) => o.year === current.year && o.month === current.month)) {
      options.unshift(current);
    }
    return { data: options };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

export type MonthlyDonutSlice = {
  category: string;
  sets: number;
  percentage: number;
};

export type MonthlyTrainingBalance = {
  upperPct: number;
  lowerPct: number;
  isBalanced: boolean;
  message: string;
};

export type MonthlyTopExercise = {
  name: string;
  strengthGainKg: number;
  sessions: number;
};

export type MonthlyAnalytics = {
  donutData: MonthlyDonutSlice[];
  workoutsCompleted: number;
  totalSets: number;
  exercisesUsed: number;
  prsHit: number;
  strengthChangePct: number | null;
  trainingBalance: MonthlyTrainingBalance;
  topExercise: MonthlyTopExercise | null;
};

/** Get full analytics for a given month. Month is 1-based (1 = January). */
export async function getMonthlyAnalytics(
  year: number,
  month: number
): Promise<{ data: MonthlyAnalytics | null; error?: string }> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { start, end } = getMonthBoundsFor(year, month - 1);
    const previousMonth = month === 1
      ? getMonthBoundsFor(year - 1, 11)
      : getMonthBoundsFor(year, month - 2);

    const [
      setsPerCategory,
      workoutsInRange,
      exerciseIds,
      prCount,
    ] = await Promise.all([
      getCategorySetsInRange(supabase, user.id, start, end),
      getWorkoutsInRange(supabase, user.id, start, end),
      getExerciseIdsInRange(supabase, user.id, start, end),
      (async () => {
        const workouts = await getWorkoutsInRange(supabase, user.id, start, end);
        const setsByW = await getSetsByWorkoutInRange(supabase, user.id, start, end);
        return countPRsInRange(
          supabase,
          user.id,
          await getExerciseIdsInRange(supabase, user.id, start, end),
          end,
          workouts,
          setsByW
        );
      })(),
    ]);

    const totalSets = Object.values(setsPerCategory).reduce((a, b) => a + b, 0);
    const donutData: MonthlyDonutSlice[] = Object.entries(setsPerCategory)
      .filter(([, n]) => n > 0)
      .map(([cat, sets]) => ({
        category: formatCategoryLabel(cat),
        sets,
        percentage: totalSets > 0 ? Math.round((sets / totalSets) * 100) : 0,
      }))
      .sort((a, b) => b.sets - a.sets);

    const { upperPct, lowerPct } = getUpperLowerFromCategorySets(setsPerCategory);
    const isBalanced = lowerPct >= 30;
    const message = isBalanced
      ? "Training distribution is balanced."
      : "Lower body training is low this month.";

    const trainingBalance: MonthlyTrainingBalance = {
      upperPct,
      lowerPct,
      isBalanced,
      message,
    };

    let strengthChangePct: number | null = null;
    let topExercise: MonthlyTopExercise | null = null;
    if (exerciseIds.length > 0) {
      const { data: exercises } = await supabase
        .from("exercises")
        .select("id, name")
        .in("id", exerciseIds)
        .eq("user_id", user.id);
      const gains: { name: string; improvementKg: number; sessions: number }[] = [];
      const improvementsPct: number[] = [];
      for (const ex of exercises ?? []) {
        const [currBest, prevBest] = await Promise.all([
          getBest1RMInRange(supabase, user.id, ex.id, start, end),
          getBest1RMInRange(supabase, user.id, ex.id, previousMonth.start, previousMonth.end),
        ]);
        const sessions = workoutsInRange.filter((w) => w.exercise_id === ex.id).length;
        const improvementKg = Math.round((currBest - prevBest) * 10) / 10;
        if (improvementKg > 0) gains.push({ name: ex.name, improvementKg, sessions });
        if (prevBest > 0 && currBest > prevBest) {
          improvementsPct.push(((currBest - prevBest) / prevBest) * 100);
        }
      }
      if (gains.length > 0) {
        gains.sort((a, b) => b.improvementKg - a.improvementKg);
        topExercise = {
          name: gains[0].name,
          strengthGainKg: gains[0].improvementKg,
          sessions: gains[0].sessions,
        };
      }
      strengthChangePct =
        improvementsPct.length > 0
          ? Math.round((improvementsPct.reduce((a, b) => a + b, 0) / improvementsPct.length) * 10) / 10
          : null;
    }

    return {
      data: {
        donutData,
        workoutsCompleted: new Set(workoutsInRange.map((w) => w.date)).size,
        totalSets,
        exercisesUsed: exerciseIds.length,
        prsHit: prCount,
        strengthChangePct,
        trainingBalance,
        topExercise,
      },
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

// --- AI insights (unified list with icons) ---

function capitalizeExerciseName(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export type InsightItem = { icon: string; text: string };

export type InsightsText = {
  items: InsightItem[];
};

/** Returns 1RM progression points per exercise for the last 90 days (one workouts + sets fetch). */
async function get1RMProgressionBulk90(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  exerciseIds: string[]
): Promise<Record<string, OneRMPoint[]>> {
  const result: Record<string, OneRMPoint[]> = {};
  for (const id of exerciseIds) result[id] = [];
  if (exerciseIds.length === 0) return result;

  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 90);
  const startStr = start.toISOString().slice(0, 10);

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, exercise_id, date, weight")
    .eq("user_id", userId)
    .in("exercise_id", exerciseIds)
    .gte("date", startStr)
    .order("date", { ascending: true });
  if (!workouts?.length) return result;
  const loadTypeByExerciseId = await getLoadTypeByExerciseId(supabase, exerciseIds);
  const bwSeries = await loadBodyweightSeriesForUser(supabase, userId);
  const categoryNameByExerciseId = await fetchCategoryNameByExerciseId(supabase, exerciseIds, userId);

  const workoutIds = workouts.map((w) => w.id);
  const { data: sets } = await supabase
    .from("sets")
    .select("workout_id, reps, weight")
    .in("workout_id", workoutIds);
  const setsByWorkout = new Map<string, SessionSetRow[]>();
  for (const s of sets ?? []) {
    const list = setsByWorkout.get(s.workout_id) ?? [];
    list.push({
      reps: Number(s.reps) || 0,
      weight: (s as { weight?: number | null }).weight ?? null,
    });
    setsByWorkout.set(s.workout_id, list);
  }
  for (const w of workouts) {
    const repsList = setsByWorkout.get(w.id) ?? [];
    const lt = loadTypeByExerciseId.get(w.exercise_id) ?? "weight";
    const best = sessionEstimated1RMFromSets(
      repsList,
      Number(w.weight) || 0,
      lt,
      bodyweightStrengthContext(
        lt,
        String(w.date),
        bwSeries,
        categoryNameByExerciseId.get(w.exercise_id)
      )
    );
    if (best > 0) {
      const points = result[w.exercise_id] ?? [];
      points.push({ date: w.date, estimated1RM: Math.round(best * 10) / 10 });
      result[w.exercise_id] = points;
    }
  }
  return result;
}

/** Exercises with no 1RM increase in the last 3 sessions. */
export async function getPlateauExercises(): Promise<{ name: string }[]> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: exercises } = await supabase
      .from("exercises")
      .select("id, name")
      .eq("user_id", user.id);
    if (!exercises?.length) return [];

    const progressionByEx = await get1RMProgressionBulk90(
      supabase,
      user.id,
      exercises.map((e) => e.id)
    );
    const out: { name: string }[] = [];
    for (const ex of exercises) {
      const points = progressionByEx[ex.id] ?? [];
      if (points.length < 3) continue;
      const last3 = points.slice(-3);
      const bestInLast3 = Math.max(...last3.map((p) => p.estimated1RM));
      const beforeLast3 = points.slice(0, -3);
      const bestBefore = beforeLast3.length > 0 ? Math.max(...beforeLast3.map((p) => p.estimated1RM)) : 0;
      if (bestInLast3 <= bestBefore) out.push({ name: ex.name });
    }
    return out;
  } catch {
    return [];
  }
}

/** Priority: 1 = strength, 2 = imbalance, 3 = volume, 4 = consistency. Lower number = higher priority. */
type InsightCandidate = { priority: number; icon: string; text: string };

export async function getInsightsText(
  weeklyComparison: WeeklyComparison | null,
  muscleDistribution: MuscleDistribution | null,
  range: InsightsRange,
  monthlySummary: MonthlySummary | null,
  plateauExercises: { name: string }[] = [],
  topStrengthGains: TopStrengthGain[] = [],
  trainingBalance: TrainingBalanceResult | null = null
): Promise<InsightsText> {
  const candidates: InsightCandidate[] = [];
  const periodLabel = range === "this_week" || range === "last_week" ? "this week" : "this month";

  // 1) Strength progress (priority 1)
  if (topStrengthGains.length > 0) {
    const top = topStrengthGains[0];
    const name = capitalizeExerciseName(top.name);
    candidates.push({
      priority: 1,
      icon: "📈",
      text: `${name} estimated 1RM increased by ${top.improvementKg} kg.`,
    });
  }

  // 2) Training imbalance / balance (priority 2)
  if (trainingBalance && (trainingBalance.upperPct > 0 || trainingBalance.lowerPct > 0)) {
    candidates.push({
      priority: 2,
      icon: "⚖",
      text: `Upper body accounts for ${trainingBalance.upperPct}% of training.`,
    });
  }

  // Recovery / variety: lower body not trained or undertrained (merged into insights)
  if (muscleDistribution?.current) {
    const upper = ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] as const;
    const lower = ["Quads", "Hamstrings", "Glutes"] as const;
    const upperSum = upper.reduce((a, m) => a + (muscleDistribution.current.find((x) => x.muscle === m)?.value ?? 0), 0);
    const lowerSum = lower.reduce((a, m) => a + (muscleDistribution.current.find((x) => x.muscle === m)?.value ?? 0), 0);
    if (lowerSum === 0 && upperSum > 0) {
      candidates.push({
        priority: 2,
        icon: "⚠",
        text: "Lower body was not trained this period. Consider adding leg exercises.",
      });
    } else if (upperSum === 0 && lowerSum > 0) {
      candidates.push({
        priority: 2,
        icon: "⚠",
        text: "Upper body was not trained this period. Consider adding upper-body exercises.",
      });
    } else if (lowerSum > 0 && upperSum > 0 && lowerSum < upperSum * 0.6) {
      candidates.push({
        priority: 2,
        icon: "⚠",
        text: "Lower body is undertrained. Consider adding quad or hamstring exercises.",
      });
    } else if (upperSum > 0 && lowerSum > 0 && upperSum < lowerSum * 0.6) {
      candidates.push({
        priority: 2,
        icon: "⚠",
        text: "Upper body is undertrained. Consider adding upper-body exercises.",
      });
    }
  }

  // 3) Weekly pace / volume (priority 3) — use pace when week is in progress to avoid misleading "down X%" mid-week
  if (weeklyComparison?.lastWeek && weeklyComparison.lastWeek.volume > 0) {
    const { paceVolume, volumePct, noLastWeekData, weekJustStarted } = weeklyComparison;
    const usePace = !noLastWeekData && !weekJustStarted && paceVolume != null;
    if (usePace) {
      if (paceVolume === "ahead") {
        candidates.push({
          priority: 3,
          icon: "📈",
          text: "Volume is ahead of last week's pace.",
        });
      } else if (paceVolume === "behind") {
        candidates.push({
          priority: 3,
          icon: "📉",
          text: "Volume is slightly behind last week's pace.",
        });
      }
      // on_pace: no insight line (neutral)
    } else if (volumePct != null && Math.abs(volumePct) >= 5) {
      if (volumePct > 0) {
        candidates.push({
          priority: 3,
          icon: "📈",
          text: `Volume increased ${volumePct}% vs last week.`,
        });
      } else {
        candidates.push({
          priority: 3,
          icon: "📉",
          text: `Volume decreased ${Math.abs(volumePct)}% vs last week.`,
        });
      }
    }
  }

  // 4) Consistency (priority 4)
  if (weeklyComparison && weeklyComparison.thisWeek.workouts > 0) {
    const { thisWeek } = weeklyComparison;
    candidates.push({
      priority: 4,
      icon: "fire",
      text: `You trained ${thisWeek.workouts} day${thisWeek.workouts !== 1 ? "s" : ""} ${periodLabel}.`,
    });
  }

  // Take up to 4 by priority; allow at most one ⚖ and one ⚠ to avoid repeating similar balance messages
  const sorted = candidates.sort((a, b) => a.priority - b.priority);
  const items: InsightItem[] = [];
  const seenBalanceIcons = new Set<string>();
  for (const c of sorted) {
    if (items.length >= 4) break;
    if ((c.icon === "⚖" || c.icon === "⚠") && seenBalanceIcons.has(c.icon)) continue;
    if (c.icon === "⚖" || c.icon === "⚠") seenBalanceIcons.add(c.icon);
    items.push({ icon: c.icon, text: c.text });
  }

  return { items };
}

// --- Combined initial load (one round-trip for insights page) ---

export type InsightsInitialData = {
  weekly: WeeklyComparison | null;
  weeklyError?: string;
  monthly: MonthlySummary | null;
  plateauExercises: { name: string }[];
  muscleBalanceRadar: MuscleBalanceRadarDistribution | null;
  muscleDistribution: MuscleDistribution | null;
  topStrengthGains: TopStrengthGain[];
  /** All-time largest 1RM improvements (earliest vs latest per exercise). Precomputed on load. */
  topStrengthGainsAllTime: TopStrengthGain[];
  trainingBalance: TrainingBalanceResult | null;
  insightItems: InsightItem[];
  /** Precomputed 1RM progression per exercise (full history). Client filters by 30/90/all. */
  estimated1RMByExercise: Estimated1RMByExercise;
};

/** Fetches all data needed for the initial insights view in one server round-trip. Includes precomputed 1RM for all exercises. */
export async function getInsightsInitialData(): Promise<InsightsInitialData> {
  try {
    const [
      weeklyRes,
      monthRes,
      plateauRes,
      categoryRes,
      muscleRes,
      gainsRes,
      balanceRes,
      oneRMRes,
    ] = await Promise.all([
      getWeeklyComparison(),
      getMonthlySummary(),
      getPlateauExercises(),
      getMuscleBalanceRadarData("this_week"),
      getMuscleDistribution("this_week"),
      getTopStrengthImprovements("this_week"),
      getTrainingBalance("this_week"),
      getAll1RMProgression(),
    ]);

    const estimated1RMByExercise = oneRMRes.data ?? {};
    const gainsAllTimeRes = await getTopStrengthGainsAllTime(estimated1RMByExercise);

    const weekly = weeklyRes.error ? null : weeklyRes.data;
    const monthly = monthRes.data ?? null;
    const plateauExercises = plateauRes ?? [];
    const muscleBalanceRadar = categoryRes.data ?? null;
    const muscleDistribution = muscleRes.data ?? null;
    const topStrengthGains = gainsRes.data ?? [];
    const topStrengthGainsAllTime = gainsAllTimeRes.data ?? [];
    const trainingBalance = balanceRes.data ?? null;

    const insightResult = await getInsightsText(
      weekly ?? null,
      muscleDistribution ?? null,
      "this_week",
      monthly ?? null,
      plateauExercises,
      topStrengthGains,
      trainingBalance
    );

    return {
      weekly,
      weeklyError: weeklyRes.error,
      monthly,
      plateauExercises,
      muscleBalanceRadar,
      muscleDistribution,
      topStrengthGains,
      topStrengthGainsAllTime,
      trainingBalance,
      insightItems: insightResult.items,
      estimated1RMByExercise,
    };
  } catch (error) {
    console.error("[insights] dashboard data loading failed", error);
    return {
      weekly: null,
      weeklyError: "Unable to load dashboard data right now.",
      monthly: null,
      plateauExercises: [],
      muscleBalanceRadar: null,
      muscleDistribution: null,
      topStrengthGains: [],
      topStrengthGainsAllTime: [],
      trainingBalance: null,
      insightItems: [],
      estimated1RMByExercise: {},
    };
  }
}

/** Deferred payload: monthly summary, plateau exercises, all-time strength gains. Merge with critical data for full InsightsInitialData. */
export type InsightsDeferredData = {
  monthly: MonthlySummary | null;
  plateauExercises: { name: string }[];
  topStrengthGainsAllTime: TopStrengthGain[];
};

/** Fetches only data needed for first paint (no monthly summary, plateau, or all-time gains). Use with getInsightsDeferredData for the rest. */
export async function getInsightsCriticalData(): Promise<InsightsInitialData> {
  const [
    weeklyRes,
    categoryRes,
    muscleRes,
    gainsRes,
    balanceRes,
    oneRMRes,
  ] = await Promise.all([
    getWeeklyComparison(),
    getMuscleBalanceRadarData("this_week"),
    getMuscleDistribution("this_week"),
    getTopStrengthImprovements("this_week"),
    getTrainingBalance("this_week"),
    getAll1RMProgression(),
  ]);

  const estimated1RMByExercise = oneRMRes.data ?? {};
  const weekly = weeklyRes.error ? null : weeklyRes.data;
  const muscleBalanceRadar = categoryRes.data ?? null;
  const muscleDistribution = muscleRes.data ?? null;
  const topStrengthGains = gainsRes.data ?? [];
  const trainingBalance = balanceRes.data ?? null;

  const insightResult = await getInsightsText(
    weekly ?? null,
    muscleDistribution ?? null,
    "this_week",
    null,
    [],
    topStrengthGains,
    trainingBalance
  );

  return {
    weekly,
    weeklyError: weeklyRes.error,
    monthly: null,
    plateauExercises: [],
    muscleBalanceRadar,
    muscleDistribution,
    topStrengthGains,
    topStrengthGainsAllTime: [],
    trainingBalance,
    insightItems: insightResult.items,
    estimated1RMByExercise,
  };
}

/** Fetches monthly summary, plateau exercises, and all-time strength gains. Call after getInsightsCriticalData and merge into state. */
export async function getInsightsDeferredData(
  estimated1RMByExercise: Estimated1RMByExercise
): Promise<InsightsDeferredData> {
  const [monthRes, plateauRes, gainsAllTimeRes] = await Promise.all([
    getMonthlySummary(),
    getPlateauExercises(),
    getTopStrengthGainsAllTime(estimated1RMByExercise),
  ]);
  return {
    monthly: monthRes.data ?? null,
    plateauExercises: plateauRes ?? [],
    topStrengthGainsAllTime: gainsAllTimeRes.data ?? [],
  };
}

export type InsightsRangeData = {
  muscleBalanceRadar: MuscleBalanceRadarDistribution | null;
  muscleDistribution: MuscleDistribution | null;
  topStrengthGains: TopStrengthGain[];
  trainingBalance: TrainingBalanceResult | null;
  insightItems: InsightItem[];
};

/** Context from initial load so insight text can include weekly/monthly when range changes. */
export type InsightsRangeContext = {
  weekly: WeeklyComparison | null;
  monthly: MonthlySummary | null;
  plateauExercises: { name: string }[];
};

/** Fetches range-dependent data (balance, radar, gains, insights text) in one round-trip. */
export async function getInsightsRangeData(
  range: InsightsRange,
  context?: InsightsRangeContext
): Promise<InsightsRangeData> {
  const [radarRes, muscleRes, gainsRes, balanceRes] = await Promise.all([
    getMuscleBalanceRadarData(range),
    getMuscleDistribution(range),
    getTopStrengthImprovements(range),
    getTrainingBalance(range),
  ]);
  const muscleBalanceRadar = radarRes.data ?? null;
  const muscleDistribution = muscleRes.data ?? null;
  const topStrengthGains = gainsRes.data ?? [];
  const trainingBalance = balanceRes.data ?? null;
  const insightResult = await getInsightsText(
    context?.weekly ?? null,
    muscleDistribution ?? null,
    range,
    context?.monthly ?? null,
    context?.plateauExercises ?? [],
    topStrengthGains,
    trainingBalance
  );
  return {
    muscleBalanceRadar,
    muscleDistribution,
    topStrengthGains,
    trainingBalance,
    insightItems: insightResult.items,
  };
}
