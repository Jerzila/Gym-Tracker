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

    const list = (workouts ?? []).slice().sort((a, b) => {
      const da = String(a.date).localeCompare(String(b.date));
      if (da !== 0) return da;
      return String(a.id).localeCompare(String(b.id));
    });
    const workoutCount = list.length;
    const exerciseCount = new Set(list.map((w) => w.exercise_id as string)).size;

    if (list.length === 0) {
      return {
        data: { workoutCount: 0, exerciseCount: 0, setCount: 0, prCount: 0, totalVolumeKg: 0 },
      };
    }

    const exerciseIds = [...new Set(list.map((w) => w.exercise_id as string))];
    const { data: exercises } = await supabase
      .from("exercises")
      .select("id, load_type")
      .in("id", exerciseIds);
    const loadTypeByExerciseId = new Map(
      (exercises ?? []).map((e) => [e.id as string, normalizeLoadType((e as { load_type?: unknown }).load_type)])
    );

    const workoutIds = list.map((w) => w.id as string);
    const CHUNK = 200;
    const allSets: { workout_id: string; reps: number }[] = [];

    for (let i = 0; i < workoutIds.length; i += CHUNK) {
      const chunk = workoutIds.slice(i, i + CHUNK);
      const { data: sets, error: sError } = await supabase
        .from("sets")
        .select("workout_id, reps")
        .in("workout_id", chunk);

      if (sError) return { data: null, error: sError.message };
      for (const s of sets ?? []) {
        allSets.push({ workout_id: s.workout_id as string, reps: Number(s.reps) });
      }
    }

    const setsByWorkout = new Map<string, number[]>();
    for (const s of allSets) {
      const arr = setsByWorkout.get(s.workout_id) ?? [];
      arr.push(s.reps);
      setsByWorkout.set(s.workout_id, arr);
    }

    const setCount = allSets.length;

    let totalVolumeKg = 0;
    for (const w of list) {
      const wid = w.id as string;
      const weight = Number(w.weight) || 0;
      for (const reps of setsByWorkout.get(wid) ?? []) {
        totalVolumeKg += weight * Math.max(0, reps);
      }
    }

    let prCount = 0;
    const bestByExercise = new Map<string, number>();
    for (const w of list) {
      const wid = w.id as string;
      const eid = w.exercise_id as string;
      const repsList = setsByWorkout.get(wid) ?? [];
      const bestReps = repsList.length > 0 ? Math.max(...repsList) : 0;
      const weight = Number(w.weight) || 0;
      const effectiveWeight = getEffectiveWeight(weight, loadTypeByExerciseId.get(eid));
      const est = epley1RM(effectiveWeight, bestReps);
      const prev = bestByExercise.get(eid) ?? 0;
      if (est >= prev) {
        prCount += 1;
      }
      bestByExercise.set(eid, Math.max(prev, est));
    }

    return {
      data: { workoutCount, exerciseCount, setCount, prCount, totalVolumeKg },
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
