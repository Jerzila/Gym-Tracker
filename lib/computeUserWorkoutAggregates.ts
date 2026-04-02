import type { SupabaseClient } from "@supabase/supabase-js";
import { epley1RM } from "@/lib/progression";
import { getEffectiveWeight, normalizeLoadType } from "@/lib/loadType";

export type UserLifetimeWorkoutAggregates = {
  workoutCount: number;
  exerciseCount: number;
  setCount: number;
  prCount: number;
  totalVolumeKg: number;
};

function isConnectionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("network");
}

/** Inclusive min date `YYYY-MM-DD` (compared to workout `date` strings). */
export function isoDateDaysAgoUTC(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function countWorkoutSessionsFromDate(
  supabase: SupabaseClient,
  userId: string,
  minDateInclusive: string
): Promise<{ count: number; error?: string }> {
  const { count, error } = await supabase
    .from("workouts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("date", minDateInclusive);

  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0 };
}

type WorkoutRow = {
  id: string;
  exercise_id: string;
  date: string;
  weight: unknown;
};

/**
 * Same aggregate definitions as lifetime totals (`computeUserLifetimeWorkoutAggregatesForUser`),
 * but for an arbitrary ordered list of workout rows (e.g. date-filtered).
 */
async function computeAggregatesFromWorkoutRows(
  supabase: SupabaseClient,
  list: WorkoutRow[]
): Promise<{ data: UserLifetimeWorkoutAggregates | null; error?: string }> {
  const sorted = list.slice().sort((a, b) => {
    const da = String(a.date).localeCompare(String(b.date));
    if (da !== 0) return da;
    return String(a.id).localeCompare(String(b.id));
  });

  const workoutCount = sorted.length;
  const exerciseCount = new Set(sorted.map((w) => w.exercise_id as string)).size;

  if (sorted.length === 0) {
    return {
      data: { workoutCount: 0, exerciseCount: 0, setCount: 0, prCount: 0, totalVolumeKg: 0 },
    };
  }

  const exerciseIds = [...new Set(sorted.map((w) => w.exercise_id as string))];
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, load_type")
    .in("id", exerciseIds);
  const loadTypeByExerciseId = new Map(
    (exercises ?? []).map((e) => [e.id as string, normalizeLoadType((e as { load_type?: unknown }).load_type)])
  );

  const workoutIds = sorted.map((w) => w.id as string);
  const CHUNK = 200;
  const allSets: { workout_id: string; reps: number; weight?: number | null }[] = [];

  for (let i = 0; i < workoutIds.length; i += CHUNK) {
    const chunk = workoutIds.slice(i, i + CHUNK);
    const { data: sets, error: sError } = await supabase
      .from("sets")
      .select("workout_id, reps, weight")
      .in("workout_id", chunk);

    if (sError) return { data: null, error: sError.message };
    for (const s of sets ?? []) {
      allSets.push({
        workout_id: s.workout_id as string,
        reps: Number(s.reps),
        weight: (s as { weight?: number | null }).weight ?? null,
      });
    }
  }

  const setsByWorkout = new Map<string, { reps: number; weight?: number | null }[]>();
  for (const s of allSets) {
    const arr = setsByWorkout.get(s.workout_id) ?? [];
    arr.push({ reps: s.reps, weight: s.weight ?? null });
    setsByWorkout.set(s.workout_id, arr);
  }

  const setCount = allSets.length;

  let totalVolumeKg = 0;
  for (const w of sorted) {
    const wid = w.id as string;
    const workoutFallbackWeight = Number(w.weight) || 0;
    for (const s of setsByWorkout.get(wid) ?? []) {
      const weight = s.weight != null ? Number(s.weight) : workoutFallbackWeight;
      totalVolumeKg += (Number(weight) || 0) * Math.max(0, Number(s.reps) || 0);
    }
  }

  let prCount = 0;
  const bestByExercise = new Map<string, number>();
  for (const w of sorted) {
    const wid = w.id as string;
    const eid = w.exercise_id as string;
    const list = setsByWorkout.get(wid) ?? [];
    const workoutFallbackWeight = Number(w.weight) || 0;
    const vals: number[] = [];
    for (const s of list) {
      const weight = s.weight != null ? Number(s.weight) : workoutFallbackWeight;
      const reps = Number(s.reps) || 0;
      const effectiveWeight = getEffectiveWeight(Number(weight) || 0, loadTypeByExerciseId.get(eid));
      const est = epley1RM(effectiveWeight, reps);
      if (est > 0) vals.push(est);
    }
    const est = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const prev = bestByExercise.get(eid) ?? 0;
    if (est >= prev) {
      prCount += 1;
    }
    bestByExercise.set(eid, Math.max(prev, est));
  }

  return {
    data: { workoutCount, exerciseCount, setCount, prCount, totalVolumeKg },
  };
}

/**
 * Profile-style PR tally for rows whose `date` falls in [startInclusive, endInclusive]:
 * chronological history through `endInclusive` for the given exercises, same `est >= prev`
 * rule as lifetime aggregates, but only increments when the workout row is in the week.
 */
async function countProfileStylePrsInWeek(
  supabase: SupabaseClient,
  userId: string,
  startInclusive: string,
  endInclusive: string,
  exerciseIds: string[]
): Promise<{ count: number; error?: string }> {
  if (exerciseIds.length === 0) return { count: 0 };

  const { data: hist, error: hError } = await supabase
    .from("workouts")
    .select("id, exercise_id, date, weight")
    .eq("user_id", userId)
    .in("exercise_id", exerciseIds)
    .lte("date", endInclusive);

  if (hError) return { count: 0, error: hError.message };

  const list = (hist ?? []).slice().sort((a, b) => {
    const da = String(a.date).localeCompare(String(b.date));
    if (da !== 0) return da;
    return String(a.id).localeCompare(String(b.id));
  });

  if (list.length === 0) return { count: 0 };

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, load_type")
    .in("id", exerciseIds);
  const loadTypeByExerciseId = new Map(
    (exercises ?? []).map((e) => [e.id as string, normalizeLoadType((e as { load_type?: unknown }).load_type)])
  );

  const workoutIds = list.map((w) => w.id as string);
  const CHUNK = 200;
  const setsByWorkout = new Map<string, { reps: number; weight?: number | null }[]>();

  for (let i = 0; i < workoutIds.length; i += CHUNK) {
    const chunk = workoutIds.slice(i, i + CHUNK);
    const { data: sets, error: sError } = await supabase
      .from("sets")
      .select("workout_id, reps, weight")
      .in("workout_id", chunk);

    if (sError) return { count: 0, error: sError.message };
    for (const s of sets ?? []) {
      const wid = s.workout_id as string;
      const arr = setsByWorkout.get(wid) ?? [];
      arr.push({
        reps: Number(s.reps),
        weight: (s as { weight?: number | null }).weight ?? null,
      });
      setsByWorkout.set(wid, arr);
    }
  }

  let prCount = 0;
  const bestByExercise = new Map<string, number>();

  for (const w of list) {
    const wid = w.id as string;
    const eid = w.exercise_id as string;
    const d = String(w.date);
    const inWeek = d >= startInclusive && d <= endInclusive;
    const listSets = setsByWorkout.get(wid) ?? [];
    const workoutFallbackWeight = Number(w.weight) || 0;
    const vals: number[] = [];
    for (const s of listSets) {
      const weight = s.weight != null ? Number(s.weight) : workoutFallbackWeight;
      const reps = Number(s.reps) || 0;
      const effectiveWeight = getEffectiveWeight(Number(weight) || 0, loadTypeByExerciseId.get(eid));
      const est = epley1RM(effectiveWeight, reps);
      if (est > 0) vals.push(est);
    }
    const est = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const prev = bestByExercise.get(eid) ?? 0;
    if (inWeek && est >= prev) {
      prCount += 1;
    }
    bestByExercise.set(eid, Math.max(prev, est));
  }

  return { count: prCount };
}

/**
 * Lifetime workout aggregates for a user. Caller supplies an authenticated Supabase client
 * (RLS applies). Used by server actions and `recalculateUserRankings`.
 */
export async function computeUserLifetimeWorkoutAggregatesForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: UserLifetimeWorkoutAggregates | null; error?: string }> {
  try {
    const { data: workouts, error: wError } = await supabase
      .from("workouts")
      .select("id, exercise_id, date, weight")
      .eq("user_id", userId);

    if (wError) return { data: null, error: wError.message };

    return computeAggregatesFromWorkoutRows(supabase, (workouts ?? []) as WorkoutRow[]);
  } catch (e) {
    if (isConnectionError(e)) {
      return { data: null, error: "Can't connect to Supabase. Check your .env.local." };
    }
    return {
      data: null,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

/**
 * Inclusive `YYYY-MM-DD` bounds. Volume / sets / workout rows match that window only.
 * PR count uses the same running-best rule as profile lifetime stats, but only counts
 * workout rows whose date is in the window (history before end of week is included for context).
 */
export async function computeUserWorkoutAggregatesForUserInDateRange(
  supabase: SupabaseClient,
  userId: string,
  startInclusive: string,
  endInclusive: string
): Promise<{ data: UserLifetimeWorkoutAggregates | null; error?: string }> {
  try {
    const { data: workouts, error: wError } = await supabase
      .from("workouts")
      .select("id, exercise_id, date, weight")
      .eq("user_id", userId)
      .gte("date", startInclusive)
      .lte("date", endInclusive);

    if (wError) return { data: null, error: wError.message };

    const weekList = (workouts ?? []) as WorkoutRow[];
    const base = await computeAggregatesFromWorkoutRows(supabase, weekList);
    if (base.error || !base.data) return base;

    const exerciseIds = [...new Set(weekList.map((w) => w.exercise_id as string))];
    const { count: prCount, error: prError } = await countProfileStylePrsInWeek(
      supabase,
      userId,
      startInclusive,
      endInclusive,
      exerciseIds
    );
    if (prError) return { data: null, error: prError };

    return {
      data: { ...base.data, prCount },
    };
  } catch (e) {
    if (isConnectionError(e)) {
      return { data: null, error: "Can't connect to Supabase. Check your .env.local." };
    }
    return {
      data: null,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}
