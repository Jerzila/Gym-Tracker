"use server";

import { createServerClient } from "@/lib/supabase/server";
import { bodyweightLoadFractionFromCategoryNames } from "@/lib/bodyweightCategoryFraction";
import {
  getBodyweightProgressMessage,
  getProgressiveOverloadMessage,
  getTimedProgressMessage,
} from "@/lib/progression";
import { getEffectiveWeight, normalizeLoadType, type LoadType } from "@/lib/loadType";
import { loadBodyweightSeriesForUser, resolveBodyweightKgFromLogs } from "@/lib/bodyweightAsOf";
import { fetchCategoryNamesByExerciseId } from "@/lib/exerciseCategoryMeta";
import { sessionEstimated1RMFromSets, type SessionSetRow } from "@/lib/sessionStrength";
import { refreshUserRankingsSafe } from "@/lib/refreshUserRankingsSafe";
import {
  computeUserLifetimeWorkoutAggregatesForUser,
  type UserLifetimeWorkoutAggregates,
} from "@/lib/computeUserWorkoutAggregates";
import type { MuscleRankUpClientPayload } from "@/lib/buildMuscleRankUpClientPayload";
import { buildMuscleRankUpClientPayload } from "@/lib/buildMuscleRankUpClientPayload";
import {
  computeStrengthRankingBundleForUser,
  getStrengthRankMusclesForExerciseCategories,
} from "@/lib/computeStrengthRankingForUser";
import { strengthRankingOutputFromRankingsRow } from "@/lib/strengthRankingFromRankingsRow";
import type { ExerciseDataPoint, StrengthRankingOutput } from "@/lib/strengthRanking";
import { computeStrengthRanking } from "@/lib/strengthRanking";
import { recalculateUserRankings } from "@/lib/recalculateUserRankings";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

export type { UserLifetimeWorkoutAggregates };
export type { MuscleRankUpClientPayload } from "@/lib/buildMuscleRankUpClientPayload";

/** Workout for calendar: one row per workout with exercise name and sets */
export type CalendarWorkout = {
  id: string;
  date: string;
  weight: number;
  estimated_1rm?: number | null;
  load_type: LoadType;
  exercise_id: string;
  exercise_name: string;
  /** Bodyweight exercises: fraction of BW used for strength math (from category). */
  bodyweight_load_fraction?: number;
  sets: { reps: number; weight?: number | null }[];
};

export type CalendarMonthPayload = {
  workouts: CalendarWorkout[];
  bodyweightContext: { profileKg: number; logsAsc: { date: string; weight: number }[] };
};

type CreateResult = {
  message?: string;
  error?: string;
  hitPr?: boolean;
  workoutId?: string;
  rankUp?: MuscleRankUpClientPayload;
};

function isConnectionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("network");
}

export async function createWorkout(
  exerciseId: string,
  formData: FormData
): Promise<CreateResult> {
  const date = (formData.get("date") as string)?.trim() || new Date().toISOString().slice(0, 10);

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in to log a workout." };

    const [{ data: exercise, error: exError }, { data: rankingsRow }] = await Promise.all([
      supabase
        .from("exercises")
        .select("rep_min, rep_max, load_type, category_id, name")
        .eq("id", exerciseId)
        .is("deleted_at", null)
        .single(),
      supabase
        .from("rankings")
        .select(
          "overall_score, overall_rank, overall_rank_label, overall_rank_slug, overall_tier, overall_progress_to_next_pct, overall_next_rank_label, overall_top_percentile_label, muscle_scores, muscle_ranks"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (exError || !exercise) {
      return { error: "Exercise not found" };
    }

    const loadType = normalizeLoadType((exercise as { load_type?: unknown }).load_type);

    type ParsedSet = { reps: number; weight: number | null };
    const parsedSets: ParsedSet[] = [];

    if (loadType === "timed") {
      for (let i = 1; i <= 5; i++) {
        const raw = formData.get(`reps_${i}`);
        if (raw === null || raw === undefined || String(raw).trim() === "") continue;
        const r = Number(raw);
        if (Number.isNaN(r) || r < 1) continue;
        const sec = Math.round(r);
        if (sec < 1) continue;
        parsedSets.push({ reps: sec, weight: null });
      }
      if (parsedSets.length === 0) {
        return { error: "Please log at least one set with time (seconds)." };
      }
    } else {
      const globalWeightRaw = formData.get("weight");
      const hasGlobalWeight = globalWeightRaw != null && String(globalWeightRaw).trim() !== "";
      const globalWeight = Number(globalWeightRaw);
      for (let i = 1; i <= 5; i++) {
        const raw = formData.get(`reps_${i}`);
        if (raw === null || raw === undefined || String(raw).trim() === "") continue;
        const r = Number(raw);
        if (Number.isNaN(r) || r < 0) continue;
        const rawW = formData.get(`weight_${i}`);
        let w: number;
        if (loadType === "bodyweight") {
          const parsed =
            rawW == null || String(rawW).trim() === ""
              ? hasGlobalWeight
                ? globalWeight
                : 0
              : Number(rawW);
          w = parsed;
          if (!Number.isFinite(w) || w < 0) {
            return { error: "Extra weight must be zero or positive." };
          }
        } else {
          w = rawW == null || String(rawW).trim() === "" ? globalWeight : Number(rawW);
          if (!Number.isFinite(w) || w <= 0) {
            return { error: "Weight must be greater than 0." };
          }
        }
        parsedSets.push({ weight: w, reps: r });
      }

      if (parsedSets.length === 0) {
        return { error: "Please log at least one set." };
      }
    }

    const { profileKg, logsAsc } = await loadBodyweightSeriesForUser(supabase, user.id);
    const userBwForDate = resolveBodyweightKgFromLogs(date, logsAsc, profileKg);

    const categoryNamesByExerciseId = await fetchCategoryNamesByExerciseId(
      supabase,
      [exerciseId],
      user.id
    );
    const exerciseCategoryNames = categoryNamesByExerciseId.get(exerciseId) ?? [];

    const bwStrengthCtx =
      loadType === "bodyweight"
        ? {
            userBodyweightKg: userBwForDate,
            bodyweightLoadFraction: bodyweightLoadFractionFromCategoryNames(exerciseCategoryNames),
          }
        : undefined;
    const bwFrac = bwStrengthCtx?.bodyweightLoadFraction ?? 1;

    const workoutWeight =
      loadType === "timed"
        ? Math.max(...parsedSets.map((s) => s.reps))
        : loadType === "bodyweight"
          ? Math.max(...parsedSets.map((s) => userBwForDate * bwFrac + (s.weight ?? 0)), 0)
          : Math.max(...parsedSets.map((s) => s.weight ?? 0));

    const strengthCtx = bwStrengthCtx;

    const bestSetEstimated1RM =
      loadType === "timed"
        ? 0
        : sessionEstimated1RMFromSets(
            parsedSets as SessionSetRow[],
            workoutWeight,
            loadType,
            strengthCtx
          );

    const { data: priorWorkouts, error: pwError } = await supabase
      .from("workouts")
      .select("id, weight, date, estimated_1rm")
      .eq("user_id", user.id)
      .eq("exercise_id", exerciseId);

    if (pwError) return { error: pwError.message };

    const priorList = priorWorkouts ?? [];
    let bestBefore = 0;

    if (priorList.length > 0) {
      const priorIds = priorList.map((w) => w.id as string);
      const { data: priorSets, error: psError } = await supabase
        .from("sets")
        .select("workout_id, reps, weight")
        .in("workout_id", priorIds);

      if (psError) return { error: psError.message };

      const setsByWorkout = new Map<string, SessionSetRow[]>();
      for (const s of priorSets ?? []) {
        const wid = s.workout_id as string;
        const list = setsByWorkout.get(wid) ?? [];
        list.push({
          reps: Number(s.reps) || 0,
          weight: (s as { weight?: number | null }).weight ?? null,
        });
        setsByWorkout.set(wid, list);
      }

      for (const w of priorList) {
        const wid = w.id as string;
        const list = setsByWorkout.get(wid) ?? [];
        if (loadType === "timed") {
          let sessionMax = 0;
          for (const s of list) {
            const t = Number(s.reps) || 0;
            if (t > sessionMax) sessionMax = t;
          }
          if (sessionMax > bestBefore) bestBefore = sessionMax;
          continue;
        }
        const stored = (w as { estimated_1rm?: number | null }).estimated_1rm;
        let rm: number;
        if (stored != null && Number.isFinite(Number(stored)) && Number(stored) > 0) {
          rm = Number(stored);
        } else {
          const loggedWeight = Number(w.weight) || 0;
          const bwAt =
            loadType === "bodyweight"
              ? resolveBodyweightKgFromLogs(String(w.date), logsAsc, profileKg)
              : 0;
          rm = sessionEstimated1RMFromSets(
            list,
            loggedWeight,
            loadType,
            loadType === "bodyweight"
              ? {
                  userBodyweightKg: bwAt,
                  bodyweightLoadFraction: bodyweightLoadFractionFromCategoryNames(exerciseCategoryNames),
                }
              : undefined
          );
        }
        if (rm > bestBefore) bestBefore = rm;
      }
    }

    const newSessionBestTime =
      loadType === "timed" ? Math.max(...parsedSets.map((s) => s.reps)) : 0;
    const hitPr =
      loadType === "timed"
        ? priorList.length > 0 && newSessionBestTime > bestBefore
        : priorList.length > 0 && bestSetEstimated1RM > bestBefore;

    const exerciseName = String((exercise as { name?: string }).name ?? "");
    const persistedBefore = strengthRankingOutputFromRankingsRow(
      rankingsRow as Record<string, unknown> | null | undefined
    );
    let beforeOutput: StrengthRankingOutput;
    let beforePoints: ExerciseDataPoint[];
    if (persistedBefore) {
      beforeOutput = persistedBefore;
      beforePoints = [];
    } else {
      const beforeBundle = await computeStrengthRankingBundleForUser(supabase, user.id);
      if (beforeBundle.ok) {
        beforeOutput = beforeBundle.bundle.output;
        beforePoints = beforeBundle.bundle.exerciseDataPoints;
      } else {
        beforeOutput = computeStrengthRanking({ exerciseDataPoints: [], bodyweightKg: 0 });
        beforePoints = [];
      }
    }
    const affectedMuscles = getStrengthRankMusclesForExerciseCategories(
      exerciseCategoryNames,
      exerciseName
    );

    const { data: workout, error: wError } = await supabase
      .from("workouts")
      .insert(
        {
          user_id: user.id,
          exercise_id: exerciseId,
          date,
          weight: workoutWeight,
          effective_weight: getEffectiveWeight(workoutWeight, loadType),
          estimated_1rm: loadType === "timed" ? 0 : bestSetEstimated1RM,
          // Deprecated by new spec; keep null to avoid confusion.
          average_estimated_1rm: null,
        } as Record<string, unknown>
      )
      .select("id")
      .single();

    if (wError) return { error: wError.message };
    if (!workout) return { error: "Failed to create workout" };

    const { error: sError } = await supabase
      .from("sets")
      .insert(
        parsedSets.map((s) => ({
          workout_id: workout.id,
          reps: s.reps,
          weight: s.weight,
        })) as Record<string, unknown>[]
      );

    if (sError) return { error: sError.message };

    let recalcSnapshot: Awaited<ReturnType<typeof recalculateUserRankings>> | null = null;
    try {
      recalcSnapshot = await recalculateUserRankings(user.id, { supabase });
    } catch (rankErr) {
      console.error("[createWorkout] recalculateUserRankings failed", rankErr);
      after(async () => {
        await refreshUserRankingsSafe(user.id);
      });
    }

    revalidatePath("/");
    revalidatePath("/account");
    revalidatePath("/exercises");
    revalidatePath(`/exercise/${exerciseId}`);

    let rankUp: MuscleRankUpClientPayload | undefined;
    if (recalcSnapshot) {
      rankUp =
        buildMuscleRankUpClientPayload({
          affectedMuscles,
          beforeOutput,
          beforePoints,
          afterOutput: recalcSnapshot.output,
          afterPoints: recalcSnapshot.exerciseDataPoints,
          workoutsLast30Days: recalcSnapshot.workoutsLast30Days,
          workoutId: workout.id as string,
        }) ?? undefined;
    }

    const message =
      loadType === "timed"
        ? getTimedProgressMessage(parsedSets.map((s) => s.reps))
        : loadType === "bodyweight"
          ? getBodyweightProgressMessage(parsedSets.map((s) => s.reps))
          : getProgressiveOverloadMessage(
              exercise.rep_min,
              exercise.rep_max,
              parsedSets.map((s) => s.reps)
            );
    return { message, hitPr, workoutId: workout.id as string, rankUp };
  } catch (e) {
    if (isConnectionError(e)) {
      return { error: "Can't connect to Supabase. Check your .env.local." };
    }
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteWorkout(
  workoutId: string,
  exerciseId: string
): Promise<{ error?: string }> {
  if (!workoutId || !exerciseId) return { error: "Missing workout or exercise id" };
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { error: setsError } = await supabase
      .from("sets")
      .delete()
      .eq("workout_id", workoutId);

    if (setsError) return { error: setsError.message };

    const { error: workoutError } = await supabase
      .from("workouts")
      .delete()
      .eq("id", workoutId);

    if (workoutError) return { error: workoutError.message };

    revalidatePath("/");
    revalidatePath("/account");
    revalidatePath(`/exercise/${exerciseId}`);

    after(async () => {
      await refreshUserRankingsSafe(user.id);
    });
    return {};
  } catch (e) {
    if (isConnectionError(e)) {
      return { error: "Can't connect to Supabase. Check your .env.local." };
    }
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export type AccountLifetimeStats = {
  workoutCount: number;
  exerciseCount: number;
  setCount: number;
  prCount: number;
};

/**
 * Lifetime workout aggregates for a user. RLS must allow the caller to read that user's workouts/sets
 * (own user, or friend when `workouts` / `sets` friend policies exist).
 */
export async function getUserLifetimeWorkoutAggregatesForUserId(
  userId: string
): Promise<{ data: UserLifetimeWorkoutAggregates | null; error?: string }> {
  try {
    const supabase = await createServerClient();
    return computeUserLifetimeWorkoutAggregatesForUser(supabase, userId);
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

/** Lifetime totals for Account dashboard (workouts, distinct exercises, sets, PR events). */
export async function getAccountLifetimeStats(): Promise<{
  data: AccountLifetimeStats | null;
  error?: string;
}> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data: agg, error } = await getUserLifetimeWorkoutAggregatesForUserId(user.id);
  if (error) return { data: null, error };
  if (!agg) return { data: null };
  const { totalVolumeKg: _v, ...rest } = agg;
  return { data: rest };
}

/** Workout counts for calendar stats: distinct workout days in each period. */
export type WorkoutCountsByPeriod = {
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
};

/** Get count of distinct workout days for this week, this month, and this year. */
export async function getWorkoutCountsByPeriod(): Promise<{
  data: WorkoutCountsByPeriod | null;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const today = now.toISOString().slice(0, 10);

    const { data: workouts, error } = await supabase
      .from("workouts")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", yearStart)
      .lte("date", today);

    if (error) return { data: null, error: error.message };

    const dates = [...new Set((workouts ?? []).map((w) => w.date as string))];

    const getMonday = (d: Date) => {
      const copy = new Date(d);
      const day = copy.getDay();
      const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
      copy.setDate(diff);
      return copy;
    };
    const monday = getMonday(now);
    const weekStart = monday.toISOString().slice(0, 10);

    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const thisWeek = dates.filter((d) => d >= weekStart && d <= today).length;
    const thisMonth = dates.filter((d) => d >= monthStart && d <= today).length;
    const thisYear = dates.length;

    return {
      data: { thisWeek, thisMonth, thisYear },
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

/** Fetch workouts for a given month; filter by logged-in user. Efficient date range query. */
export async function getWorkoutsByMonth(
  year: number,
  month: number
): Promise<{ data: CalendarMonthPayload | null; error?: string }> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const bodyweightContext = await loadBodyweightSeriesForUser(supabase, user.id);
    const bwPayload = {
      profileKg: bodyweightContext.profileKg,
      logsAsc: bodyweightContext.logsAsc,
    };

    const { data: workouts, error: wError } = await supabase
      .from("workouts")
      .select("id, date, weight, estimated_1rm, exercise_id")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true });

    if (wError) return { data: null, error: wError.message };
    if (!workouts?.length) return { data: { workouts: [], bodyweightContext: bwPayload } };

    const exerciseIds = [...new Set(workouts.map((w) => w.exercise_id))];
    const { data: exercises, error: exError } = await supabase
      .from("exercises")
      .select("id, name, load_type, category_id")
      .in("id", exerciseIds);

    if (exError) return { data: null, error: exError.message };
    const nameById = new Map((exercises ?? []).map((e) => [e.id, e.name]));
    const loadTypeById = new Map(
      (exercises ?? []).map((e) => [e.id, normalizeLoadType((e as { load_type?: unknown }).load_type)])
    );
    const categoryNamesByExerciseId = await fetchCategoryNamesByExerciseId(
      supabase,
      exerciseIds,
      user.id
    );

    const workoutIds = workouts.map((w) => w.id);
    const { data: sets, error: sError } = await supabase
      .from("sets")
      .select("workout_id, reps, weight")
      .in("workout_id", workoutIds);

    if (sError) return { data: null, error: sError.message };
    const setsByWorkout = new Map<string, { reps: number; weight?: number | null }[]>();
    for (const s of sets ?? []) {
      const list = setsByWorkout.get(s.workout_id) ?? [];
      list.push({ reps: s.reps, weight: (s as { weight?: number | null }).weight ?? null });
      setsByWorkout.set(s.workout_id, list);
    }

    const list: CalendarWorkout[] = workouts.map((w) => {
      const lt = loadTypeById.get(w.exercise_id) ?? "weight";
      const cats = categoryNamesByExerciseId.get(w.exercise_id) ?? [];
      return {
        id: w.id,
        date: w.date,
        weight: w.weight,
        estimated_1rm: (w as { estimated_1rm?: number | null }).estimated_1rm ?? null,
        load_type: lt,
        exercise_id: w.exercise_id,
        exercise_name: nameById.get(w.exercise_id) ?? "Unknown",
        ...(lt === "bodyweight"
          ? { bodyweight_load_fraction: bodyweightLoadFractionFromCategoryNames(cats) }
          : {}),
        sets: setsByWorkout.get(w.id) ?? [],
      };
    });

    return { data: { workouts: list, bodyweightContext: bwPayload } };
  } catch (e) {
    if (isConnectionError(e)) {
      return { data: null, error: "Can't connect to Supabase. Check your .env.local." };
    }
    return { data: null, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/** Summary of the most recent workout day for dashboard. */
export type LastWorkoutSummary = {
  date: string;
  title: string;
  exerciseCount: number;
  prHit: boolean;
  /** Exercise names in workout order (for dashboard list). */
  exerciseNames: string[];
  /** Exercise IDs in same order as exerciseNames (for PR highlighting). */
  exerciseIds: string[];
  /** Exercise IDs that had a PR this session. */
  prExerciseIds: string[];
};

/** Get the most recent workout day summary (date, category title, exercise count, PR). */
export async function getLastWorkoutSummary(): Promise<{
  data: LastWorkoutSummary | null;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data: latestRow, error: dateError } = await supabase
      .from("workouts")
      .select("date")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1)
      .single();

    if (dateError || !latestRow?.date) return { data: null };

    const date = latestRow.date as string;

    const { data: dayWorkouts, error: wError } = await supabase
      .from("workouts")
      .select("id, exercise_id, weight, estimated_1rm")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("exercise_id");

    if (wError || !dayWorkouts?.length)
      return { data: { date, title: "Workout", exerciseCount: 0, prHit: false, exerciseNames: [], exerciseIds: [], prExerciseIds: [] } };

    const exerciseIds = [...new Set(dayWorkouts.map((w) => w.exercise_id))];
    const { data: exercises, error: exError } = await supabase
      .from("exercises")
      .select("id, name, category_id, load_type")
      .in("id", exerciseIds);
    const loadTypeByExerciseId = new Map(
      (exercises as { id: string; load_type?: unknown }[]).map((e) => [e.id, normalizeLoadType(e.load_type)])
    );


    if (exError || !exercises?.length) {
      return {
        data: {
          date,
          title: "Workout",
          exerciseCount: dayWorkouts.length,
          prHit: false,
          exerciseNames: [],
          exerciseIds: [],
          prExerciseIds: [],
        },
      };
    }

    const nameById = new Map(
      (exercises as { id: string; name: string }[]).map((e) => [e.id, e.name])
    );
    const exerciseNames = dayWorkouts.map(
      (w) => nameById.get(w.exercise_id) ?? "Exercise"
    );
    const exerciseIdsInOrder = dayWorkouts.map((w) => w.exercise_id);

    const allCategoryNamesByExercise = await fetchCategoryNamesByExerciseId(
      supabase,
      exerciseIds,
      user.id
    );
    const titleNameSet = new Set<string>();
    for (const exId of exerciseIds) {
      for (const n of allCategoryNamesByExercise.get(exId) ?? []) titleNameSet.add(n);
    }
    const uniqueCategoryLabels = [...titleNameSet].sort((a, b) => a.localeCompare(b));
    const title = uniqueCategoryLabels.length > 0 ? uniqueCategoryLabels.join(" + ") : "Workout";

    const workoutIds = dayWorkouts.map((w) => w.id);
    const { data: sets } = await supabase
      .from("sets")
      .select("workout_id, reps, weight")
      .in("workout_id", workoutIds);

    const setsByW = new Map<string, { reps: number; weight?: number | null }[]>();
    for (const s of sets ?? []) {
      const list = setsByW.get(s.workout_id) ?? [];
      list.push({ reps: s.reps, weight: (s as { weight?: number | null }).weight ?? null });
      setsByW.set(s.workout_id, list);
    }

    const { profileKg, logsAsc } = await loadBodyweightSeriesForUser(supabase, user.id);

    const sessions: Session1RM[] = dayWorkouts.map((w) => {
      const stored = (w as { estimated_1rm?: number | null }).estimated_1rm;
      if (stored != null && Number.isFinite(Number(stored)) && Number(stored) > 0) {
        return { exercise_id: w.exercise_id, estimated1RM: Number(stored) };
      }
      const list = setsByW.get(w.id) ?? [];
      const loggedWeight = Number(w.weight) || 0;
      const lt = loadTypeByExerciseId.get(w.exercise_id) ?? "weight";
      const bwAt =
        lt === "bodyweight"
          ? resolveBodyweightKgFromLogs(date, logsAsc, profileKg)
          : 0;
      const estimated1RM =
        lt === "timed"
          ? list.reduce((m, s) => Math.max(m, Number(s.reps) || 0), 0)
          : sessionEstimated1RMFromSets(
              list as SessionSetRow[],
              loggedWeight,
              lt,
              lt === "bodyweight"
                ? {
                    userBodyweightKg: bwAt,
                    bodyweightLoadFraction: bodyweightLoadFractionFromCategoryNames(
                      allCategoryNamesByExercise.get(w.exercise_id) ?? []
                    ),
                  }
                : undefined
            );
      return {
        exercise_id: w.exercise_id,
        estimated1RM,
      };
    });

    const { prExerciseIds } = await getPRsForDate(date, sessions);

    return {
      data: {
        date,
        title,
        exerciseCount: dayWorkouts.length,
        prHit: prExerciseIds.length > 0,
        exerciseNames,
        exerciseIds: exerciseIdsInOrder,
        prExerciseIds,
      },
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

/** Session 1RM for PR check */
export type Session1RM = { exercise_id: string; estimated1RM: number };

/** Return exercise_ids that were PRs on the given date (best 1RM before that date). */
export async function getPRsForDate(
  date: string,
  sessions: Session1RM[]
): Promise<{ prExerciseIds: string[]; error?: string }> {
  if (!sessions.length) return { prExerciseIds: [] };
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { prExerciseIds: [], error: "Not authenticated" };

    const prExerciseIds: string[] = [];
    const sessionExerciseIds = [...new Set(sessions.map((s) => s.exercise_id))];
    const { data: exerciseRows } = await supabase
      .from("exercises")
      .select("id, load_type")
      .in("id", sessionExerciseIds);
    const loadTypeByExerciseId = new Map(
      (exerciseRows ?? []).map((e) => [e.id, normalizeLoadType((e as { load_type?: unknown }).load_type)])
    );

    const categoryNamesByExerciseId = await fetchCategoryNamesByExerciseId(
      supabase,
      sessionExerciseIds,
      user.id
    );

    const { profileKg, logsAsc } = await loadBodyweightSeriesForUser(supabase, user.id);

    for (const { exercise_id, estimated1RM } of sessions) {
      const { data: workouts, error } = await supabase
        .from("workouts")
        .select("id, weight, date, estimated_1rm")
        .eq("user_id", user.id)
        .eq("exercise_id", exercise_id)
        .lt("date", date)
        .order("date", { ascending: false });

      if (error) continue;
      if (!workouts?.length) {
        prExerciseIds.push(exercise_id);
        continue;
      }

      const workoutIds = workouts.map((w) => w.id);
      const { data: sets } = await supabase
        .from("sets")
        .select("workout_id, reps, weight")
        .in("workout_id", workoutIds);

      const setsByWorkout = new Map<string, { reps: number; weight?: number | null }[]>();
      for (const s of sets ?? []) {
        const list = setsByWorkout.get(s.workout_id) ?? [];
        list.push({ reps: s.reps, weight: (s as { weight?: number | null }).weight ?? null });
        setsByWorkout.set(s.workout_id, list);
      }

      let bestBefore = 0;
      const lt = loadTypeByExerciseId.get(exercise_id) ?? "weight";
      if (lt === "timed") {
        for (const w of workouts) {
          const list = setsByWorkout.get(w.id) ?? [];
          const sessionMax = list.reduce((m, s) => Math.max(m, Number(s.reps) || 0), 0);
          if (sessionMax > bestBefore) bestBefore = sessionMax;
        }
        if (estimated1RM > bestBefore) prExerciseIds.push(exercise_id);
        continue;
      }
      for (const w of workouts) {
        const list = setsByWorkout.get(w.id) ?? [];
        const stored = (w as { estimated_1rm?: number | null }).estimated_1rm;
        let rm: number;
        if (stored != null && Number.isFinite(Number(stored)) && Number(stored) > 0) {
          rm = Number(stored);
        } else {
          const loggedWeight = Number(w.weight) || 0;
          const bwAt =
            lt === "bodyweight"
              ? resolveBodyweightKgFromLogs(String(w.date), logsAsc, profileKg)
              : 0;
          rm = sessionEstimated1RMFromSets(
            list as SessionSetRow[],
            loggedWeight,
            lt,
            lt === "bodyweight"
              ? {
                  userBodyweightKg: bwAt,
                  bodyweightLoadFraction: bodyweightLoadFractionFromCategoryNames(
                    categoryNamesByExerciseId.get(exercise_id) ?? []
                  ),
                }
              : undefined
          );
        }
        if (rm > bestBefore) bestBefore = rm;
      }
      if (estimated1RM >= bestBefore) prExerciseIds.push(exercise_id);
    }
    return { prExerciseIds };
  } catch (e) {
    return {
      prExerciseIds: [],
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}
