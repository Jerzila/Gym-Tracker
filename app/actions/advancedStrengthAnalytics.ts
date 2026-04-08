"use server";

import { createServerClient } from "@/lib/supabase/server";
import { fetchCategoryNameByExerciseId } from "@/lib/exerciseCategoryMeta";
import { loadBodyweightSeriesForUser, resolveBodyweightKgFromLogs } from "@/lib/bodyweightAsOf";
import { normalizeLoadType } from "@/lib/loadType";
import {
  bodyweightStrengthSessionContext,
  type SessionSetRow,
} from "@/lib/sessionStrength";
import type { MaxSessionWeightPoint } from "@/lib/strengthVelocity";
import {
  getAllStrengthChartSeries,
  type OneRMPoint,
  type StrengthChartSeriesBundle,
} from "@/app/actions/insights";
import {
  computeBestProgressPeriod,
  computeConsistencyCvFromSessionMaxLoads,
  computeExerciseImprovementRank,
  computeProgressRateFromMaxWeights,
  computeTotalProgressFromMaxWeights,
  computeTrainingFrequency,
  countPersonalRecordWorkoutsFromHistory,
  formatMonthArrowMonth,
  type PrAnalysisWorkout,
} from "@/lib/advancedStrengthAnalytics";

const CONSISTENCY_CARD_EXPLANATION =
  "Measures how stable your performance is between workouts. Lower variation means more consistent strength.";
const PR_FREQUENCY_CARD_EXPLANATION =
  "How often you set a new personal record for this exercise.";
const PR_FREQUENCY_EMPTY_EXPLANATION =
  "Log more workouts to start tracking PR frequency.";

export type AdvancedStrengthMetricCard = {
  kind:
    | "progress"
    | "progress_rate"
    | "frequency"
    | "best_period"
    | "consistency"
    | "pr_frequency"
    | "exercise_rank";
  title: string;
  /** Fallback / non-weight main line */
  mainText: string;
  subText: string;
  trend: "positive" | "neutral" | "negative";
  spark: number[] | null;
  /** Max session load delta (kg), first → last day */
  rawDeltaKg?: number;
  /** Progress rate: kg/month (max load, analytics window) */
  rawKgPerMonth?: number;
  /** Progress rate: total kg change earliest → latest max load in window */
  rawProgressWindowDeltaKg?: number;
  /** Progress rate: % per month (max-load % change, analytics window) */
  rawPercentPerMonth?: number;
  /** Progress rate: total % increase earliest → latest max load in window */
  rawTotalPercentIncrease?: number;
  rawGainKg?: number;
  rawSessionsPerWeek?: number;
  /** CV as coefficient-of-variation × 100 (e.g. 5.5 → display ±5.5%) */
  rawCvPercent?: number;
  /** Total workouts ÷ PR workouts (for “1 PR every X workouts”) */
  prEveryWorkouts?: number;
  /** Longer muted help copy shown under the metric row */
  explanation?: string;
};

export type AdvancedStrengthExerciseRow = {
  exerciseId: string;
  exerciseName: string;
  insufficient: boolean;
  cards: AdvancedStrengthMetricCard[];
};

export type AdvancedStrengthExerciseOption = {
  id: string;
  name: string;
};

export type AdvancedStrengthCategoryOption = {
  id: string;
  name: string;
  /** Exercises in this category with ≥1 workout (non-timed), most recent first */
  exercises: AdvancedStrengthExerciseOption[];
};

/** Request for server action (plain object for Next serialization). */
export type AdvancedStrengthAnalyticsRequest = {
  categoryId?: string;
  exerciseId?: string;
};

export type AdvancedStrengthAnalyticsPayload = {
  categories: AdvancedStrengthCategoryOption[];
  selectedCategoryId: string | null;
  selectedExerciseId: string | null;
  row: AdvancedStrengthExerciseRow | null;
  error?: string;
};

const UNCATEGORIZED_CATEGORY_ID = "__uncategorized__";
const UNCATEGORIZED_CATEGORY_NAME = "Uncategorized";

/** Last workout date per exercise_id for the user (any workout row). */
async function loadLastWorkoutDateByExercise(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string
): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("workouts").select("exercise_id, date").eq("user_id", userId);
  if (error || !data?.length) return new Map();
  const m = new Map<string, string>();
  for (const w of data) {
    const id = w.exercise_id as string;
    const d = String(w.date);
    const prev = m.get(id);
    if (!prev || d > prev) m.set(id, d);
  }
  return m;
}

type CategoryExerciseBuild = {
  categories: AdvancedStrengthCategoryOption[];
  defaultCategoryId: string;
  defaultExerciseId: string;
};

/**
 * Group eligible exercises by category (exercise_categories → categories).
 * Exercises with no mapping go under "Uncategorized". Multi-mapped exercises use the first category by name.
 */
async function buildCategoryExerciseOptions(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string
): Promise<CategoryExerciseBuild | null> {
  const lastByEx = await loadLastWorkoutDateByExercise(supabase, userId);
  if (lastByEx.size === 0) return null;

  const ids = [...lastByEx.keys()];
  const { data: exerciseRows } = await supabase
    .from("exercises")
    .select("id, name, load_type")
    .eq("user_id", userId)
    .in("id", ids);

  const eligible: { id: string; name: string; lastDate: string }[] = [];
  for (const e of exerciseRows ?? []) {
    const id = e.id as string;
    const lt = normalizeLoadType((e as { load_type?: unknown }).load_type);
    if (lt === "timed") continue;
    const lastDate = lastByEx.get(id);
    if (!lastDate) continue;
    eligible.push({ id, name: (e as { name: string }).name, lastDate });
  }

  if (eligible.length === 0) return null;

  const { data: mappings } = await supabase
    .from("exercise_categories")
    .select("exercise_id, category_id")
    .in("exercise_id", eligible.map((x) => x.id));

  const { data: catRows } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId);

  const catNameById = new Map((catRows ?? []).map((c) => [c.id as string, String((c as { name: string }).name)]));

  const mappingsByExercise = new Map<string, string[]>();
  for (const m of mappings ?? []) {
    const exId = m.exercise_id as string;
    const cid = m.category_id as string;
    const list = mappingsByExercise.get(exId) ?? [];
    list.push(cid);
    mappingsByExercise.set(exId, list);
  }

  const exercisePrimaryCategory = new Map<string, string>();
  for (const ex of eligible) {
    const mapped = (mappingsByExercise.get(ex.id) ?? []).filter((cid) => catNameById.has(cid));
    if (mapped.length === 0) {
      exercisePrimaryCategory.set(ex.id, UNCATEGORIZED_CATEGORY_ID);
    } else {
      mapped.sort((a, b) => (catNameById.get(a) ?? "").localeCompare(catNameById.get(b) ?? ""));
      exercisePrimaryCategory.set(ex.id, mapped[0]);
    }
  }

  const byCategory = new Map<string, AdvancedStrengthCategoryOption>();

  function ensureCategory(catId: string): AdvancedStrengthCategoryOption {
    let c = byCategory.get(catId);
    if (!c) {
      const name =
        catId === UNCATEGORIZED_CATEGORY_ID
          ? UNCATEGORIZED_CATEGORY_NAME
          : (catNameById.get(catId) ?? "Unknown");
      c = { id: catId, name, exercises: [] };
      byCategory.set(catId, c);
    }
    return c;
  }

  for (const ex of eligible) {
    const catId = exercisePrimaryCategory.get(ex.id)!;
    ensureCategory(catId).exercises.push({ id: ex.id, name: ex.name });
  }

  for (const c of byCategory.values()) {
    c.exercises.sort((a, b) => {
      const da = lastByEx.get(a.id) ?? "";
      const db = lastByEx.get(b.id) ?? "";
      const cmp = db.localeCompare(da);
      return cmp !== 0 ? cmp : a.name.localeCompare(b.name);
    });
  }

  const categories = [...byCategory.values()].sort((a, b) => {
    if (a.id === UNCATEGORIZED_CATEGORY_ID) return 1;
    if (b.id === UNCATEGORIZED_CATEGORY_ID) return -1;
    return a.name.localeCompare(b.name);
  });

  let defaultEx = eligible[0];
  for (const ex of eligible) {
    if (ex.lastDate > defaultEx.lastDate) defaultEx = ex;
  }
  const defaultExerciseId = defaultEx.id;
  const defaultCategoryId = exercisePrimaryCategory.get(defaultExerciseId)!;

  return { categories, defaultCategoryId, defaultExerciseId };
}

async function loadPrAnalysisWorkoutsForExercise(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  exerciseId: string
): Promise<PrAnalysisWorkout[]> {
  const { data: exRow } = await supabase
    .from("exercises")
    .select("load_type")
    .eq("id", exerciseId)
    .maybeSingle();

  const lt = normalizeLoadType((exRow as { load_type?: unknown } | null)?.load_type);
  if (lt === "timed") return [];

  const { data: workouts, error: wErr } = await supabase
    .from("workouts")
    .select("id, date, weight")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .order("date", { ascending: true });

  if (wErr || !workouts?.length) return [];

  const ids = workouts.map((w) => w.id as string);
  const { data: sets, error: sErr } = await supabase
    .from("sets")
    .select("workout_id, reps, weight")
    .in("workout_id", ids);

  if (sErr) return [];

  const setsByWorkout = new Map<string, SessionSetRow[]>();
  for (const s of sets ?? []) {
    const wid = s.workout_id as string;
    const list = setsByWorkout.get(wid) ?? [];
    list.push({
      reps: Number(s.reps) || 0,
      weight: (s as { weight?: number | null }).weight ?? null,
    });
    setsByWorkout.set(wid, list);
  }

  const bw = await loadBodyweightSeriesForUser(supabase, userId);
  const catNames = await fetchCategoryNameByExerciseId(supabase, [exerciseId], userId);

  const out: PrAnalysisWorkout[] = [];
  for (const w of workouts) {
    const id = w.id as string;
    const d = String(w.date);
    const weightFb = Number(w.weight) || 0;
    const bwAt =
      lt === "bodyweight"
        ? resolveBodyweightKgFromLogs(d, bw.logsAsc, bw.profileKg)
        : 0;
    out.push({
      id,
      date: d,
      weightFallbackKg: weightFb,
      sets: setsByWorkout.get(id) ?? [],
      loadType: lt,
      bwCtx:
        lt === "bodyweight"
          ? bodyweightStrengthSessionContext(bwAt, catNames.get(exerciseId))
          : undefined,
    });
  }
  return out;
}

function buildAnalyticsRowForExercise(
  exerciseId: string,
  exerciseName: string,
  bundle: StrengthChartSeriesBundle,
  prWorkouts: PrAnalysisWorkout[]
): AdvancedStrengthExerciseRow {
  const { estimated1RMByExercise, maxSessionWeightByExercise } = bundle;
  const points = (estimated1RMByExercise[exerciseId] ?? []) as OneRMPoint[];
  const maxPts: MaxSessionWeightPoint[] = maxSessionWeightByExercise[exerciseId] ?? [];
  const sessionDates = points.map((p) => p.date);

  const workoutCount = Math.max(points.length, maxPts.length);
  if (workoutCount < 2) {
    return {
      exerciseId,
      exerciseName,
      insufficient: true,
      cards: [],
    };
  }

  const cards: AdvancedStrengthMetricCard[] = [];

  const totalProg = computeTotalProgressFromMaxWeights(maxPts);
  if (totalProg.kind === "ok") {
    const trend =
      totalProg.deltaKg > 0 ? "positive" : totalProg.deltaKg < 0 ? "negative" : "neutral";
    cards.push({
      kind: "progress",
      title: "TOTAL PROGRESS",
      mainText: "",
      subText: "Since first recorded workout",
      trend,
      spark: null,
      rawDeltaKg: totalProg.deltaKg,
    });
  } else {
    cards.push({
      kind: "progress",
      title: "TOTAL PROGRESS",
      mainText: "—",
      subText: "Since first recorded workout",
      trend: "neutral",
      spark: null,
    });
  }

  const progRate = computeProgressRateFromMaxWeights(maxPts);
  if (progRate.kind === "ok") {
    const trend =
      progRate.percentPerMonth > 0
        ? "positive"
        : progRate.percentPerMonth < 0
          ? "negative"
          : "neutral";
    cards.push({
      kind: "progress_rate",
      title: "PROGRESS RATE",
      mainText: "",
      subText: "",
      trend,
      spark: null,
      rawKgPerMonth: progRate.kgPerMonth,
      rawProgressWindowDeltaKg: progRate.totalDeltaKg,
      rawPercentPerMonth: progRate.percentPerMonth,
      rawTotalPercentIncrease: progRate.totalPercentIncrease,
      explanation: "Based on recorded workout history",
    });
  } else {
    cards.push({
      kind: "progress_rate",
      title: "PROGRESS RATE",
      mainText: "—",
      subText: "",
      trend: "neutral",
      spark: null,
    });
  }

  const freq = computeTrainingFrequency(sessionDates);
  if (freq.kind === "ok") {
    cards.push({
      kind: "frequency",
      title: "Training frequency",
      mainText: "",
      subText: "Average over last 90 days",
      trend: "neutral",
      spark: null,
      rawSessionsPerWeek: freq.sessionsPerWeek,
    });
  } else if (freq.kind === "one_session") {
    cards.push({
      kind: "frequency",
      title: "Training frequency",
      mainText: "1 session logged",
      subText: "Average over last 90 days",
      trend: "neutral",
      spark: null,
    });
  } else {
    cards.push({
      kind: "frequency",
      title: "Training frequency",
      mainText: "—",
      subText: "Not enough data to calculate frequency.",
      trend: "neutral",
      spark: null,
    });
  }

  const best = computeBestProgressPeriod(points, 30);
  if (best && best.gainKg > 0) {
    cards.push({
      kind: "best_period",
      title: "Best progress period",
      mainText: formatMonthArrowMonth(best.startDate, best.endDate),
      subText: "",
      trend: "positive",
      spark: null,
      rawGainKg: best.gainKg,
    });
  } else {
    cards.push({
      kind: "best_period",
      title: "Best progress period",
      mainText: "—",
      subText: "No clear 30-day gain window yet.",
      trend: "neutral",
      spark: null,
    });
  }

  const consistency = computeConsistencyCvFromSessionMaxLoads(maxPts);
  if (consistency) {
    cards.push({
      kind: "consistency",
      title: "CONSISTENCY",
      mainText: "",
      subText: consistency.bandLabel,
      trend: consistency.trend,
      spark: null,
      rawCvPercent: consistency.cvPercent,
      explanation: CONSISTENCY_CARD_EXPLANATION,
    });
  } else {
    cards.push({
      kind: "consistency",
      title: "CONSISTENCY",
      mainText: "—",
      subText: "",
      trend: "neutral",
      spark: null,
      explanation: CONSISTENCY_CARD_EXPLANATION,
    });
  }

  const prAgg = countPersonalRecordWorkoutsFromHistory(prWorkouts);
  if (prAgg.prWorkoutCount > 0) {
    const every = prAgg.workoutCount / prAgg.prWorkoutCount;
    const prEveryWorkouts = Math.round(every * 10) / 10;
    cards.push({
      kind: "pr_frequency",
      title: "PR FREQUENCY",
      mainText: "",
      subText: "",
      trend: "neutral",
      spark: null,
      prEveryWorkouts,
      explanation: PR_FREQUENCY_CARD_EXPLANATION,
    });
  } else {
    cards.push({
      kind: "pr_frequency",
      title: "PR FREQUENCY",
      mainText: "No PRs yet",
      subText: "",
      trend: "neutral",
      spark: null,
      explanation: PR_FREQUENCY_EMPTY_EXPLANATION,
    });
  }

  const rankRes = computeExerciseImprovementRank(maxSessionWeightByExercise, exerciseId);
  let exerciseRankCard: AdvancedStrengthMetricCard;
  if (rankRes.kind === "insufficient_pool") {
    exerciseRankCard = {
      kind: "exercise_rank",
      title: "EXERCISE RANK",
      mainText: "Not enough data to rank exercises yet.",
      subText: "",
      trend: "neutral",
      spark: null,
    };
  } else if (rankRes.kind === "insufficient_self") {
    exerciseRankCard = {
      kind: "exercise_rank",
      title: "EXERCISE RANK",
      mainText: "Not enough data to rank this exercise yet.",
      subText: "Requires 2+ workouts over 7+ days.",
      trend: "neutral",
      spark: null,
    };
  } else {
    const { rank, total } = rankRes;
    let mainText: string;
    if (rank === 1) mainText = "Your fastest improving lift";
    else if (rank === total && total > 1) mainText = "Slowest improving lift";
    else mainText = `#${rank} fastest improving lift`;
    const trend =
      rank === 1 ? "positive" : rank === total && total > 1 ? "negative" : "neutral";
    exerciseRankCard = {
      kind: "exercise_rank",
      title: "EXERCISE RANK",
      mainText,
      subText: `out of ${total} exercises`,
      trend,
      spark: null,
    };
  }
  cards.push(exerciseRankCard);

  return { exerciseId, exerciseName, insufficient: false, cards };
}

function resolveSelection(
  categories: AdvancedStrengthCategoryOption[],
  defaultCategoryId: string,
  defaultExerciseId: string,
  request?: AdvancedStrengthAnalyticsRequest | null
): { categoryId: string; exerciseId: string } {
  const catIds = new Set(categories.map((c) => c.id));

  let categoryId: string | null =
    request?.categoryId && catIds.has(request.categoryId) ? request.categoryId : null;
  let exerciseId: string | null =
    request?.exerciseId && typeof request.exerciseId === "string" ? request.exerciseId : null;

  if (exerciseId && !categoryId) {
    const found = categories.find((c) => c.exercises.some((e) => e.id === exerciseId));
    if (found) categoryId = found.id;
  }

  if (!categoryId) categoryId = defaultCategoryId;

  let cat = categories.find((c) => c.id === categoryId);
  if (!cat) {
    categoryId = defaultCategoryId;
    cat = categories.find((c) => c.id === categoryId)!;
  }

  const inCat = new Set(cat.exercises.map((e) => e.id));
  if (!exerciseId || !inCat.has(exerciseId)) {
    exerciseId = cat.exercises[0].id;
  }

  return { categoryId, exerciseId };
}

/**
 * Advanced strength analytics for one exercise, with category + exercise filtering.
 * Omit request to use the category of the most recently logged exercise and that exercise.
 */
export async function getAdvancedStrengthAnalytics(
  request?: AdvancedStrengthAnalyticsRequest | null
): Promise<AdvancedStrengthAnalyticsPayload> {
  const empty = (): AdvancedStrengthAnalyticsPayload => ({
    categories: [],
    selectedCategoryId: null,
    selectedExerciseId: null,
    row: null,
  });

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ...empty(), error: "Not authenticated" };
    }

    const built = await buildCategoryExerciseOptions(supabase, user.id);
    if (!built) {
      return empty();
    }

    const { categories, defaultCategoryId, defaultExerciseId } = built;
    const { categoryId, exerciseId: selected } = resolveSelection(
      categories,
      defaultCategoryId,
      defaultExerciseId,
      request
    );

    const exerciseName =
      categories
        .find((c) => c.id === categoryId)
        ?.exercises.find((e) => e.id === selected)?.name ?? "Exercise";

    const [seriesRes, prWorkouts] = await Promise.all([
      getAllStrengthChartSeries(),
      loadPrAnalysisWorkoutsForExercise(supabase, user.id, selected),
    ]);

    if (seriesRes.error) {
      return {
        categories,
        selectedCategoryId: categoryId,
        selectedExerciseId: selected,
        row: null,
        error: seriesRes.error,
      };
    }

    const bundle = seriesRes.data;

    const row = buildAnalyticsRowForExercise(selected, exerciseName, bundle, prWorkouts);

    return {
      categories,
      selectedCategoryId: categoryId,
      selectedExerciseId: selected,
      row,
    };
  } catch (e) {
    return {
      ...empty(),
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}
