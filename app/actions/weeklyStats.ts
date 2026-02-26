"use server";

import { createServerClient } from "@/lib/supabase/server";
import { epley1RM } from "@/lib/progression";

/** Week bounds: Monday 00:00 to Sunday 23:59. Uses user's local timezone if provided, else UTC. */
function getWeekBounds(timezone?: string): { weekStart: string; weekEnd: string } {
  const now = new Date();

  if (timezone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
    const y = Number(get("year"));
    const m = Number(get("month"));
    const d = Number(get("day"));
    const dayOfWeek = now.toLocaleDateString("en-US", { timeZone: timezone, weekday: "short" });
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const localDay = dayMap[dayOfWeek] ?? 0;
    const daysFromMonday = (localDay + 6) % 7;
    const mondayUtc = new Date(Date.UTC(y, m - 1, d - daysFromMonday));
    const sundayUtc = new Date(Date.UTC(y, m - 1, d - daysFromMonday + 6));
    return {
      weekStart: mondayUtc.toISOString().slice(0, 10),
      weekEnd: sundayUtc.toISOString().slice(0, 10),
    };
  }

  const utcDay = now.getUTCDay();
  const daysFromMonday = (utcDay + 6) % 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysFromMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(monday);
  weekEnd.setUTCDate(monday.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: weekEnd.toISOString().slice(0, 10),
  };
}

export type WeeklyStats = {
  workoutCount: number;
  setCount: number;
  volume: number;
  prCount: number;
};

export async function getWeeklyStats(timezone?: string): Promise<WeeklyStats | null> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { weekStart, weekEnd } = getWeekBounds(timezone);

    const { data: weekWorkouts, error: wError } = await supabase
      .from("workouts")
      .select("id, exercise_id, date, weight")
      .gte("date", weekStart)
      .lte("date", weekEnd)
      .order("date", { ascending: true });

    if (wError) throw new Error(wError.message);
    const workouts = weekWorkouts ?? [];

    if (workouts.length === 0) {
      return { workoutCount: 0, setCount: 0, volume: 0, prCount: 0 };
    }

    const workoutIds = workouts.map((w) => w.id);
    const { data: sets, error: sError } = await supabase
      .from("sets")
      .select("workout_id, reps")
      .in("workout_id", workoutIds);

    if (sError) throw new Error(sError.message);
    const setsList = sets ?? [];
    const setsByWorkout = new Map<string, { reps: number }[]>();
    for (const s of setsList) {
      const list = setsByWorkout.get(s.workout_id) ?? [];
      list.push({ reps: s.reps });
      setsByWorkout.set(s.workout_id, list);
    }

    let setCount = 0;
    let volume = 0;
    const workoutMap = new Map(
      workouts.map((w) => [
        w.id,
        {
          exercise_id: w.exercise_id,
          date: w.date,
          weight: Number(w.weight),
          sets: setsByWorkout.get(w.id) ?? [],
        },
      ])
    );
    for (const w of workouts) {
      const row = workoutMap.get(w.id);
      if (!row) continue;
      setCount += row.sets.length;
      for (const s of row.sets) {
        volume += row.weight * s.reps;
      }
    }

    const exerciseIds = [...new Set(workouts.map((w) => w.exercise_id))];

    const { data: historyWorkouts, error: hError } = await supabase
      .from("workouts")
      .select("id, exercise_id, date, weight")
      .in("exercise_id", exerciseIds)
      .lte("date", weekEnd)
      .order("date", { ascending: true });

    if (hError) throw new Error(hError.message);
    const history = historyWorkouts ?? [];
    const historyIds = history.map((h) => h.id);
    if (historyIds.length === 0) {
      return {
        workoutCount: workouts.length,
        setCount,
        volume: Math.round(volume),
        prCount: 0,
      };
    }

    const { data: historySets, error: hsError } = await supabase
      .from("sets")
      .select("workout_id, reps")
      .in("workout_id", historyIds);

    if (hsError) throw new Error(hsError.message);
    const historySetsList = historySets ?? [];
    const historySetsByWorkout = new Map<string, { reps: number }[]>();
    for (const s of historySetsList) {
      const list = historySetsByWorkout.get(s.workout_id) ?? [];
      list.push({ reps: s.reps });
      historySetsByWorkout.set(s.workout_id, list);
    }

    const historyWithSets = history.map((h) => ({
      exercise_id: h.exercise_id,
      date: h.date,
      weight: Number(h.weight),
      sets: historySetsByWorkout.get(h.id) ?? [],
      inWeek: h.date >= weekStart && h.date <= weekEnd,
    }));

    const exerciseMaxBefore = new Map<
      string,
      { maxWeight: number; max1RM: number }
    >();
    let prCount = 0;
    for (const w of historyWithSets) {
      const ex = w.exercise_id;
      const prev = exerciseMaxBefore.get(ex) ?? { maxWeight: 0, max1RM: 0 };
      let workoutBest1RM = 0;
      for (const s of w.sets) {
        workoutBest1RM = Math.max(workoutBest1RM, epley1RM(w.weight, s.reps));
      }
      if (w.inWeek) {
        const isWeightPR = w.weight > prev.maxWeight;
        const is1RMPR = workoutBest1RM > prev.max1RM;
        if (isWeightPR || is1RMPR) prCount++;
      }
      const newMaxWeight = Math.max(prev.maxWeight, w.weight);
      const newMax1RM = Math.max(prev.max1RM, workoutBest1RM);
      exerciseMaxBefore.set(ex, { maxWeight: newMaxWeight, max1RM: newMax1RM });
    }

    return {
      workoutCount: workouts.length,
      setCount,
      volume: Math.round(volume),
      prCount,
    };
  } catch {
    return null;
  }
}
