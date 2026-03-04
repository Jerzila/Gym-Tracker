"use server";

import { createServerClient } from "@/lib/supabase/server";
import { epley1RM } from "@/lib/progression";
import { getWeekBounds, getMonthBounds, getMonthBoundsFor, getWeekProgress } from "@/lib/insightsDates";
import { MUSCLE_GROUPS, categoryToMuscle, type MuscleGroup } from "@/lib/muscleMapping";

export type WeekStats = {
  volume: number;
  workouts: number;
  sets: number;
  prs: number;
};

export type PaceStatus = "ahead" | "on_pace" | "behind";

export type WeeklyComparison = {
  thisWeek: WeekStats;
  lastWeek: WeekStats;
  volumePct: number | null;
  workoutsDiff: number;
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
  paceSets: PaceStatus | null;
  pacePrs: PaceStatus | null;
};

// --- Training Score ---

export type TrainingScoreResult = {
  score: number;
  consistencyScore: number;
  strengthScore: number;
  balanceScore: number;
  consistencyTrend: "up" | "down" | "neutral";
  strengthTrend: "up" | "down" | "neutral";
  balanceTrend: "up" | "down" | "neutral";
};

export async function getTrainingScore(): Promise<{
  data: TrainingScoreResult | null;
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

    const [
      thisWeekWorkoutDays,
      lastWeekWorkoutDays,
      thisWeekSetsByCategory,
      lastWeekSetsByCategory,
      exerciseIdsWithWorkoutsThisWeek,
    ] = await Promise.all([
      getWorkoutDaysInRange(supabase, user.id, thisBounds.start, thisBounds.end),
      getWorkoutDaysInRange(supabase, user.id, lastBounds.start, lastBounds.end),
      getCategorySetsInRange(supabase, user.id, thisBounds.start, thisBounds.end),
      getCategorySetsInRange(supabase, user.id, lastBounds.start, lastBounds.end),
      getExerciseIdsInRange(supabase, user.id, thisBounds.start, thisBounds.end),
    ]);

    const currentWorkouts = thisWeekWorkoutDays;
    const expectedWorkouts = lastWeekWorkoutDays * weekProgress;

    let consistencyScore: number;
    let consistencyTrend: "up" | "down" | "neutral";
    if (lastWeekWorkoutDays === 0) {
      consistencyScore = currentWorkouts >= 2 ? 100 : Math.min(100, currentWorkouts * 50);
      consistencyTrend = currentWorkouts >= 2 ? "up" : "neutral";
    } else {
      if (expectedWorkouts <= 0) {
        consistencyScore = currentWorkouts > 0 ? 100 : 0;
        consistencyTrend = currentWorkouts > 0 ? "up" : "neutral";
      } else {
        const ratio = currentWorkouts / expectedWorkouts;
        consistencyScore = Math.min(100, Math.round(ratio * 100));
        if (currentWorkouts > expectedWorkouts * 1.1) consistencyTrend = "up";
        else if (currentWorkouts >= expectedWorkouts * 0.9 && currentWorkouts <= expectedWorkouts * 1.1)
          consistencyTrend = "neutral";
        else consistencyTrend = "down";
      }
    }

    let strengthScore = 0;
    let strengthTrend: "up" | "down" | "neutral" = "neutral";
    if (exerciseIdsWithWorkoutsThisWeek.length > 0) {
      const [currBestMap, prevBestMap] = await Promise.all([
        getBest1RMByExerciseInRange(supabase, user.id, exerciseIdsWithWorkoutsThisWeek, thisBounds.start, thisBounds.end),
        getBest1RMByExerciseInRange(supabase, user.id, exerciseIdsWithWorkoutsThisWeek, lastBounds.start, lastBounds.end),
      ]);
      let improvedCount = 0;
      for (const exId of exerciseIdsWithWorkoutsThisWeek) {
        const curr = currBestMap[exId] ?? 0;
        const prev = prevBestMap[exId] ?? 0;
        if (curr > 0 && curr > prev) improvedCount++;
      }
      strengthScore = Math.min(100, Math.round((improvedCount / exerciseIdsWithWorkoutsThisWeek.length) * 100));
      strengthTrend = improvedCount > 0 ? "up" : exerciseIdsWithWorkoutsThisWeek.length > 0 ? "down" : "neutral";
    }

    const { upperPct, lowerPct } = getUpperLowerFromCategorySets(thisWeekSetsByCategory);
    const balanceDiff = Math.abs(upperPct - lowerPct);
    const balanceScore = Math.max(0, Math.min(100, Math.round(100 - balanceDiff)));
    const balanceTrend: "up" | "down" | "neutral" = balanceDiff <= 30 ? "up" : "down";

    const score = Math.round(
      Math.min(100, Math.max(0, consistencyScore * 0.4 + strengthScore * 0.4 + balanceScore * 0.2))
    );

    return {
      data: {
        score,
        consistencyScore,
        strengthScore,
        balanceScore,
        consistencyTrend,
        strengthTrend,
        balanceTrend,
      },
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

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
    .select("id, exercise_id, weight")
    .eq("user_id", userId)
    .in("exercise_id", exerciseIds)
    .gte("date", start)
    .lte("date", end);
  if (!workouts?.length) return result;

  const workoutIds = workouts.map((w) => w.id);
  const { data: sets } = await supabase
    .from("sets")
    .select("workout_id, reps")
    .in("workout_id", workoutIds);
  const setsByWorkout = new Map<string, number[]>();
  for (const s of sets ?? []) {
    const list = setsByWorkout.get(s.workout_id) ?? [];
    list.push(s.reps);
    setsByWorkout.set(s.workout_id, list);
  }
  for (const w of workouts) {
    let best = result[w.exercise_id] ?? 0;
    for (const r of setsByWorkout.get(w.id) ?? []) {
      best = Math.max(best, epley1RM(Number(w.weight), r));
    }
    result[w.exercise_id] = best;
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

export type TopStrengthGain = { name: string; improvementKg: number };

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
    const expectedSets = lastStats.sets * weekProgress;
    const expectedPrs = lastStats.prs * weekProgress;

    const paceVolume =
      noLastWeekData || weekJustStarted ? null : paceStatus(thisStats.volume, expectedVolume);
    const paceWorkouts =
      noLastWeekData || weekJustStarted ? null : paceStatus(thisStats.workouts, expectedWorkouts);
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
        setsPct: setsPct ?? 0,
        prsDiff: thisStats.prs - lastStats.prs,
        weekProgress,
        noLastWeekData,
        weekJustStarted,
        paceVolume,
        paceWorkouts,
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
    return { volume: 0, workouts: 0, sets: 0, prs: 0 };
  }

  const workoutIds = workouts.map((w) => w.id);
  const { data: sets, error: sError } = await supabase
    .from("sets")
    .select("workout_id, reps")
    .in("workout_id", workoutIds);

  if (sError) return { volume: 0, workouts: 0, sets: 0, prs: 0 };
  const setsByWorkout = new Map<string, number[]>();
  for (const s of sets ?? []) {
    const list = setsByWorkout.get(s.workout_id) ?? [];
    list.push(s.reps);
    setsByWorkout.set(s.workout_id, list);
  }

  let volume = 0;
  let setCount = 0;
  const exerciseIds = [...new Set(workouts.map((w) => w.exercise_id))];

  for (const w of workouts) {
    const repsList = setsByWorkout.get(w.id) ?? [];
    setCount += repsList.length;
    for (const r of repsList) {
      volume += Number(w.weight) * r;
    }
  }

  const prCount = await countPRsInRange(supabase, userId, exerciseIds, end, workouts, setsByWorkout);

  return {
    volume: Math.round(volume),
    workouts: workouts.length,
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
  setsByWorkout: Map<string, number[]>
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

  const histIds = history.map((h) => h.id);
  const { data: histSets } = await supabase
    .from("sets")
    .select("workout_id, reps")
    .in("workout_id", histIds);

  const histSetsByWorkout = new Map<string, number[]>();
  for (const s of histSets ?? []) {
    const list = histSetsByWorkout.get(s.workout_id) ?? [];
    list.push(s.reps);
    histSetsByWorkout.set(s.workout_id, list);
  }

  const exerciseBestBefore = new Map<string, number>();
  let prCount = 0;

  for (const h of history) {
    const inRange = workoutsInRange.some((w) => w.id === h.id);
    const repsList = histSetsByWorkout.get(h.id) ?? [];
    let best1RM = 0;
    for (const r of repsList) {
      best1RM = Math.max(best1RM, epley1RM(Number(h.weight), r));
    }
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

export type InsightsRange = "this_week" | "last_week" | "this_month" | "last_month";

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
    .select("id, exercise_id, weight")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end);

  if (wError || !workouts?.length) return vol;

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
  const exerciseToMuscle = new Map<string, MuscleGroup>();
  for (const e of exercises ?? []) {
    const name = catNameById.get(e.category_id);
    if (name) {
      const muscle = categoryToMuscle(name);
      if (muscle) exerciseToMuscle.set(e.id, muscle);
    }
  }

  const workoutIds = workouts.map((w) => w.id);
  const { data: sets } = await supabase
    .from("sets")
    .select("workout_id, reps")
    .in("workout_id", workoutIds);

  const setsByWorkout = new Map<string, number[]>();
  for (const s of sets ?? []) {
    const list = setsByWorkout.get(s.workout_id) ?? [];
    list.push(s.reps);
    setsByWorkout.set(s.workout_id, list);
  }

  for (const w of workouts) {
    const muscle = exerciseToMuscle.get(w.exercise_id);
    if (!muscle) continue;
    const repsList = setsByWorkout.get(w.id) ?? [];
    for (const r of repsList) {
      vol[muscle] += Number(w.weight) * r;
    }
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

// --- 1RM progression ---

export type OneRMPoint = { date: string; estimated1RM: number };

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
      .select("id, date, weight")
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
      .select("workout_id, reps")
      .in("workout_id", workoutIds);

    if (sError) return { data: [], error: sError.message };
    const setsByWorkout = new Map<string, number[]>();
    for (const s of sets ?? []) {
      const list = setsByWorkout.get(s.workout_id) ?? [];
      list.push(s.reps);
      setsByWorkout.set(s.workout_id, list);
    }

    const points: OneRMPoint[] = [];
    for (const w of workouts) {
      const repsList = setsByWorkout.get(w.id) ?? [];
      let best = 0;
      for (const r of repsList) {
        best = Math.max(best, epley1RM(Number(w.weight), r));
      }
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
    .select("id, weight")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end);
  if (!workouts?.length) return 0;
  const ids = workouts.map((w) => w.id);
  const { data: sets } = await supabase
    .from("sets")
    .select("workout_id, reps")
    .in("workout_id", ids);
  const byW = new Map<string, number[]>();
  for (const s of sets ?? []) {
    const list = byW.get(s.workout_id) ?? [];
    list.push(s.reps);
    byW.set(s.workout_id, list);
  }
  let v = 0;
  for (const w of workouts) {
    for (const r of byW.get(w.id) ?? []) {
      v += Number(w.weight) * r;
    }
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
): Promise<Map<string, number[]>> {
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
    .select("workout_id, reps")
    .in("workout_id", ids);
  const byW = new Map<string, number[]>();
  for (const s of sets ?? []) {
    const list = byW.get(s.workout_id) ?? [];
    list.push(s.reps);
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

  const workoutIds = workouts.map((w) => w.id);
  const { data: sets } = await supabase
    .from("sets")
    .select("workout_id, reps")
    .in("workout_id", workoutIds);
  const setsByWorkout = new Map<string, number[]>();
  for (const s of sets ?? []) {
    const list = setsByWorkout.get(s.workout_id) ?? [];
    list.push(s.reps);
    setsByWorkout.set(s.workout_id, list);
  }
  for (const w of workouts) {
    const repsList = setsByWorkout.get(w.id) ?? [];
    let best = 0;
    for (const r of repsList) {
      best = Math.max(best, epley1RM(Number(w.weight), r));
    }
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
      icon: "🔥",
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
  trainingScore: TrainingScoreResult | null;
  trainingScoreError?: string;
  categoryDistribution: CategoryDistribution | null;
  muscleDistribution: MuscleDistribution | null;
  topStrengthGains: TopStrengthGain[];
  trainingBalance: TrainingBalanceResult | null;
  insightItems: InsightItem[];
};

/** Fetches all data needed for the initial insights view in one server round-trip. */
export async function getInsightsInitialData(): Promise<InsightsInitialData> {
  const [
    weeklyRes,
    monthRes,
    plateauRes,
    scoreRes,
    categoryRes,
    muscleRes,
    gainsRes,
    balanceRes,
  ] = await Promise.all([
    getWeeklyComparison(),
    getMonthlySummary(),
    getPlateauExercises(),
    getTrainingScore(),
    getCategoryDistribution("this_week"),
    getMuscleDistribution("this_week"),
    getTopStrengthImprovements("this_week"),
    getTrainingBalance("this_week"),
  ]);

  const weekly = weeklyRes.error ? null : weeklyRes.data;
  const monthly = monthRes.data ?? null;
  const plateauExercises = plateauRes ?? [];
  const trainingScore = scoreRes.data ?? null;
  const categoryDistribution = categoryRes.data ?? null;
  const muscleDistribution = muscleRes.data ?? null;
  const topStrengthGains = gainsRes.data ?? [];
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
    trainingScore,
    trainingScoreError: scoreRes.error,
    categoryDistribution,
    muscleDistribution,
    topStrengthGains,
    trainingBalance,
    insightItems: insightResult.items,
  };
}

export type InsightsRangeData = {
  categoryDistribution: CategoryDistribution | null;
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
  const [categoryRes, muscleRes, gainsRes, balanceRes] = await Promise.all([
    getCategoryDistribution(range),
    getMuscleDistribution(range),
    getTopStrengthImprovements(range),
    getTrainingBalance(range),
  ]);
  const categoryDistribution = categoryRes.data ?? null;
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
    categoryDistribution,
    muscleDistribution,
    topStrengthGains,
    trainingBalance,
    insightItems: insightResult.items,
  };
}
