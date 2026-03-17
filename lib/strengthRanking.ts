/**
 * Liftly Strength Ranking System
 *
 * Uses a non-linear strength score (Estimated1RM / Bodyweight) with difficulty
 * multipliers, recency weighting, and weighted top-3 exercises per muscle.
 * Supports unilateral exercises, core (reps/time), and precise improvement suggestions.
 */

// --- Strength rank muscle groups ---

export const DEFAULT_STRENGTH_MUSCLE_GROUPS = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "biceps",
  "triceps",
  "core",
  "forearms",
] as const;

export const PRIMARY_STRENGTH_RANK_MUSCLES = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "biceps",
  "triceps",
] as const;

export const STRENGTH_RANK_MUSCLES = [
  ...PRIMARY_STRENGTH_RANK_MUSCLES,
  "forearms",
  "traps",
  "core",
] as const;
export type StrengthRankMuscle = (typeof STRENGTH_RANK_MUSCLES)[number];

export function categoryToStrengthMuscles(categoryName: string): StrengthRankMuscle[] {
  const name = categoryName.trim().toLowerCase();
  if (!name) return [];
  if (name.includes("chest")) return ["chest"];
  if (name.includes("back") || name.includes("lat")) return ["back"];
  if (name.includes("shoulder")) return ["shoulders"];
  if (name.includes("bicep")) return ["biceps"];
  if (name.includes("tricep")) return ["triceps"];
  if (name.includes("forearm") || name.includes("wrist") || name.includes("grip")) return ["forearms"];
  if (name.includes("trap") || name.includes("trapez")) return ["traps"];
  if (
    name.includes("leg") ||
    name.includes("quad") ||
    name.includes("hamstring") ||
    name.includes("glute") ||
    name.includes("calf") ||
    name.includes("squat") ||
    name.includes("deadlift") ||
    name.includes("lunge") ||
    name.includes("lower body")
  )
    return ["legs"];
  if (name.includes("upper body")) return ["chest", "back", "shoulders", "biceps", "triceps"];
  if (name.includes("core") || name.includes("abs") || name.includes("oblique")) return ["core"];
  return [];
}

// --- 1. Global percentile structure (Top 100–90% = Newbie, … Top 1% = GOAT) ---

export const RANK_ORDER = [
  "Newbie",
  "Starter",
  "Apprentice",
  "Lifter",
  "Semi-Pro",
  "Pro",
  "Elite",
  "Master",
  "Grandmaster",
  "Titan",
  "GOAT",
] as const;

/** Each rank = percentile bracket. III = bottom third, II = middle, I = top third. */
export const PERCENTILE_RANGES_BY_RANK: { rank: string; minPct: number; maxPct: number }[] = [
  { rank: "Newbie", minPct: 90, maxPct: 100 },
  { rank: "Starter", minPct: 80, maxPct: 90 },
  { rank: "Apprentice", minPct: 70, maxPct: 80 },
  { rank: "Lifter", minPct: 60, maxPct: 70 },
  { rank: "Semi-Pro", minPct: 50, maxPct: 60 },
  { rank: "Pro", minPct: 35, maxPct: 50 },
  { rank: "Elite", minPct: 20, maxPct: 35 },
  { rank: "Master", minPct: 10, maxPct: 20 },
  { rank: "Grandmaster", minPct: 5, maxPct: 10 },
  { rank: "Titan", minPct: 2, maxPct: 5 },
  { rank: "GOAT", minPct: 1, maxPct: 2 },
];

// --- 2. Per-muscle strength score thresholds ---

type ThresholdEntry = { score: number; rank: string };

const CHEST_THRESHOLDS: ThresholdEntry[] = [
  { score: 0.3, rank: "Newbie" },
  { score: 0.45, rank: "Starter" },
  { score: 0.65, rank: "Apprentice" },
  { score: 0.85, rank: "Lifter" },
  { score: 1.05, rank: "Semi-Pro" },
  { score: 1.2, rank: "Pro" },
  { score: 1.4, rank: "Elite" },
  { score: 1.55, rank: "Master" },
  { score: 1.7, rank: "Grandmaster" },
  { score: 1.9, rank: "Titan" },
  { score: 2.1, rank: "GOAT" },
];

const BACK_THRESHOLDS: ThresholdEntry[] = [
  { score: 0.35, rank: "Newbie" },
  { score: 0.5, rank: "Starter" },
  { score: 0.7, rank: "Apprentice" },
  { score: 0.9, rank: "Lifter" },
  { score: 1.1, rank: "Semi-Pro" },
  { score: 1.25, rank: "Pro" },
  { score: 1.45, rank: "Elite" },
  { score: 1.6, rank: "Master" },
  { score: 1.75, rank: "Grandmaster" },
  { score: 1.9, rank: "Titan" },
  { score: 2.05, rank: "GOAT" },
];

const LEGS_THRESHOLDS: ThresholdEntry[] = [
  { score: 0.4, rank: "Newbie" },
  { score: 0.6, rank: "Starter" },
  { score: 0.85, rank: "Apprentice" },
  { score: 1.1, rank: "Lifter" },
  { score: 1.35, rank: "Semi-Pro" },
  { score: 1.6, rank: "Pro" },
  { score: 1.85, rank: "Elite" },
  { score: 2.1, rank: "Master" },
  { score: 2.35, rank: "Grandmaster" },
  { score: 2.6, rank: "Titan" },
  { score: 2.9, rank: "GOAT" },
];

const SHOULDERS_THRESHOLDS: ThresholdEntry[] = [
  { score: 0.18, rank: "Newbie" },
  { score: 0.3, rank: "Starter" },
  { score: 0.42, rank: "Apprentice" },
  { score: 0.55, rank: "Lifter" },
  { score: 0.7, rank: "Semi-Pro" },
  { score: 0.85, rank: "Pro" },
  { score: 1.0, rank: "Elite" },
  { score: 1.12, rank: "Master" },
  { score: 1.25, rank: "Grandmaster" },
  { score: 1.38, rank: "Titan" },
  { score: 1.5, rank: "GOAT" },
];

const BICEPS_THRESHOLDS: ThresholdEntry[] = [
  { score: 0.07, rank: "Newbie" },
  { score: 0.11, rank: "Starter" },
  { score: 0.16, rank: "Apprentice" },
  { score: 0.23, rank: "Lifter" },
  { score: 0.32, rank: "Semi-Pro" },
  { score: 0.42, rank: "Pro" },
  { score: 0.5, rank: "Elite" },
  { score: 0.58, rank: "Master" },
  { score: 0.65, rank: "Grandmaster" },
  { score: 0.75, rank: "Titan" },
  { score: 0.85, rank: "GOAT" },
];

const TRICEPS_THRESHOLDS: ThresholdEntry[] = [
  { score: 0.16, rank: "Newbie" },
  { score: 0.24, rank: "Starter" },
  { score: 0.36, rank: "Apprentice" },
  { score: 0.52, rank: "Lifter" },
  { score: 0.68, rank: "Semi-Pro" },
  { score: 0.85, rank: "Pro" },
  { score: 1.05, rank: "Elite" },
  { score: 1.2, rank: "Master" },
  { score: 1.35, rank: "Grandmaster" },
  { score: 1.5, rank: "Titan" },
  { score: 1.7, rank: "GOAT" },
];

const FOREARMS_THRESHOLDS: ThresholdEntry[] = [
  { score: 0.05, rank: "Newbie" },
  { score: 0.08, rank: "Starter" },
  { score: 0.12, rank: "Apprentice" },
  { score: 0.18, rank: "Lifter" },
  { score: 0.25, rank: "Semi-Pro" },
  { score: 0.32, rank: "Pro" },
  { score: 0.4, rank: "Elite" },
  { score: 0.48, rank: "Master" },
  { score: 0.55, rank: "Grandmaster" },
  { score: 0.62, rank: "Titan" },
  { score: 0.7, rank: "GOAT" },
];

const CORE_THRESHOLDS: ThresholdEntry[] = [
  { score: 0.3, rank: "Newbie" },
  { score: 0.45, rank: "Starter" },
  { score: 0.6, rank: "Apprentice" },
  { score: 0.75, rank: "Lifter" },
  { score: 0.9, rank: "Semi-Pro" },
  { score: 1.05, rank: "Pro" },
  { score: 1.2, rank: "Elite" },
  { score: 1.35, rank: "Master" },
  { score: 1.5, rank: "Grandmaster" },
  { score: 1.65, rank: "Titan" },
  { score: 1.8, rank: "GOAT" },
];

/** Per-muscle thresholds. Traps use Back. */
export function getThresholdsForMuscle(muscle: StrengthRankMuscle): ThresholdEntry[] {
  switch (muscle) {
    case "chest":
      return CHEST_THRESHOLDS;
    case "back":
    case "traps":
      return BACK_THRESHOLDS;
    case "legs":
      return LEGS_THRESHOLDS;
    case "shoulders":
      return SHOULDERS_THRESHOLDS;
    case "biceps":
      return BICEPS_THRESHOLDS;
    case "triceps":
      return TRICEPS_THRESHOLDS;
    case "forearms":
      return FOREARMS_THRESHOLDS;
    case "core":
      return CORE_THRESHOLDS;
    default:
      return CHEST_THRESHOLDS;
  }
}

/** Rank slug for badge/UI (lowercase, kebab). */
export function rankToSlug(rank: string): string {
  const slug = rank.toLowerCase().replace(/\s+/g, "-");
  return slug === "semi-pro" ? "semi-pro" : slug === "goat" ? "goat" : slug;
}

/**
 * Map strength score to rank, tier (III = lowest, I = highest), and progress.
 * Uses per-muscle thresholds. Progress = (score - currentThreshold) / (nextThreshold - currentThreshold).
 */
export function strengthScoreToRank(
  score: number,
  muscle: StrengthRankMuscle
): {
  rank: string;
  tier: "I" | "II" | "III";
  rankLabel: string;
  rankSlug: string;
  currentThreshold: number;
  nextThreshold: number | null;
  progressToNextPct: number;
  /** "Top X%" (0-100) for display. */
  topPercentile: number;
} {
  const thresholds = getThresholdsForMuscle(muscle);
  const clamped = Math.max(0, score);

  for (let i = 0; i < thresholds.length; i++) {
    const current = thresholds[i];
    const next = thresholds[i + 1];
    const bandMax = next ? next.score : current.score + 0.01;
    if (clamped < bandMax) {
      const width = bandMax - current.score;
      const progressInBand = width > 0 ? (clamped - current.score) / width : 0;
      const third = 1 / 3;
      let tier: "I" | "II" | "III";
      if (progressInBand < third) tier = "III";
      else if (progressInBand < 2 * third) tier = "II";
      else tier = "I";
      const tierStart = current.score + (tier === "III" ? 0 : tier === "II" ? third * width : 2 * third * width);
      const tierEnd = current.score + (tier === "III" ? third * width : tier === "II" ? 2 * third * width : width);
      const progressToNextPct =
        tierEnd > tierStart
          ? Math.round(((clamped - tierStart) / (tierEnd - tierStart)) * 100)
          : 100;
      const rankLabel = current.rank === "GOAT" ? "GOAT 🐐" : `${current.rank} ${tier}`;
      const pctRange = PERCENTILE_RANGES_BY_RANK[i];
      const tierIndex = tier === "III" ? 0 : tier === "II" ? 1 : 2;
      const pctWidth = (pctRange.maxPct - pctRange.minPct) / 3;
      const topPercentile = Math.round(
        pctRange.minPct + (tierIndex + 0.5) * pctWidth
      );
      return {
        rank: current.rank,
        tier,
        rankLabel,
        rankSlug: rankToSlug(current.rank),
        currentThreshold: current.score,
        nextThreshold: next?.score ?? null,
        progressToNextPct: Math.min(100, Math.max(0, progressToNextPct)),
        topPercentile: Math.min(100, Math.max(1, topPercentile)),
      };
    }
  }
  const last = thresholds[thresholds.length - 1];
  const pctRange = PERCENTILE_RANGES_BY_RANK[PERCENTILE_RANGES_BY_RANK.length - 1];
  return {
    rank: last.rank,
    tier: "I",
    rankLabel: last.rank === "GOAT" ? "GOAT 🐐" : `${last.rank} I`,
    rankSlug: rankToSlug(last.rank),
    currentThreshold: last.score,
    nextThreshold: null,
    progressToNextPct: 100,
    topPercentile: Math.round((pctRange.minPct + pctRange.maxPct) / 2),
  };
}

/** Next rank threshold for a muscle (for improvement suggestions). */
export function getNextRankThreshold(score: number, muscle: StrengthRankMuscle): number | null {
  const thresholds = getThresholdsForMuscle(muscle);
  for (const t of thresholds) {
    if (score < t.score) return t.score;
  }
  return null;
}

/** Legacy: single global threshold list (chest) for callers that don't pass muscle. */
export const STRENGTH_SCORE_THRESHOLDS = CHEST_THRESHOLDS;

// --- 2 & 3. Exercise strength score and muscle score ---

/** Epley: Estimated1RM = Weight × (1 + Reps / 30). */
export function epleyEstimated1RM(weightKg: number, reps: number): number {
  if (reps <= 0) return weightKg;
  return weightKg * (1 + reps / 30);
}

/**
 * Exercise strength score for weight-based exercises:
 * (Estimated1RM / Bodyweight) × ExerciseMultiplier
 */
export function exerciseStrengthScore(
  estimated1RMKg: number,
  bodyweightKg: number,
  exerciseMultiplier: number
): number {
  if (bodyweightKg <= 0) return 0;
  return (estimated1RMKg / bodyweightKg) * exerciseMultiplier;
}

/**
 * Muscle score = weighted average of top 3 exercise scores.
 * 3 exercises: 0.5×best + 0.3×second + 0.2×third
 * 2 exercises: 0.7×best + 0.3×second
 * 1 exercise: score as-is
 */
export function muscleScoreFromTopExercises(scores: number[]): number {
  const sorted = [...scores].filter((s) => s > 0).sort((a, b) => b - a);
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return Math.round(sorted[0] * 100) / 100;
  if (sorted.length === 2)
    return Math.round((0.7 * sorted[0] + 0.3 * sorted[1]) * 100) / 100;
  return Math.round((0.5 * sorted[0] + 0.3 * sorted[1] + 0.2 * sorted[2]) * 100) / 100;
}

// --- 4. Exercise difficulty multipliers (prevent machines from inflating ranks) ---
// Free weight compound = 1.0, Dumbbells = 0.9, Cable = 0.80, Machines = 0.65, Assisted = 0.55

const EXERCISE_MULTIPLIER_KEYWORDS: { keywords: string[]; multiplier: number }[] = [
  { keywords: ["assisted", "push-up", "pushup", "pull-up assist", "band "], multiplier: 0.55 },
  { keywords: ["machine", "smith", "leg press", "pec deck", "cable row", "machine row", "machine curl", "machine shoulder", "machine press", "leg extension", "leg curl", "hack squat machine"], multiplier: 0.65 },
  { keywords: ["cable", "cable fly", "cable crossover", "cable curl", "lat pulldown", "pull-down", "pushdown", "tricep pushdown"], multiplier: 0.8 },
  { keywords: ["dumbbell", "db ", "db press", "db row", "db shoulder", "db curl", "dumbbell press", "dumbbell row", "dumbbell curl", "hammer curl", "concentration curl", "arnold press", "single arm"], multiplier: 0.9 },
  { keywords: ["barbell", "bench press", "ohp", "overhead press", "military press", "bent over row", "pendlay", "squat", "deadlift", "rdl", "pull-up", "pullup", "chin-up", "close grip bench", "cgbp", "dip", "dips", "ez bar", "skull crusher"], multiplier: 1.0 },
];

const DEFAULT_EXERCISE_MULTIPLIER = 0.8;

/** Resolve exercise difficulty multiplier from name (and optionally category). */
export function getExerciseMultiplier(exerciseName: string, _categoryName?: string): number {
  const name = exerciseName.trim().toLowerCase();
  for (const { keywords, multiplier } of EXERCISE_MULTIPLIER_KEYWORDS) {
    if (keywords.some((kw) => name.includes(kw))) return multiplier;
  }
  return DEFAULT_EXERCISE_MULTIPLIER;
}

// --- 5. Unilateral detection ---

const UNILATERAL_KEYWORDS = [
  "single arm",
  "one arm",
  "unilateral",
  "concentration curl",
  "single leg",
  "one leg",
  "single-leg",
  "one-leg",
];

export function isUnilateralExercise(exerciseName: string): boolean {
  const name = exerciseName.trim().toLowerCase();
  return UNILATERAL_KEYWORDS.some((kw) => name.includes(kw));
}

/** Adjusted weight for unilateral: Weight × 1.8 (approximates bilateral). */
export const UNILATERAL_WEIGHT_FACTOR = 1.8;

// --- 6. Recency weighting ---

/** Recency weight by days ago: 0–30 = 100%, 30–60 = 85%, 60–120 = 70%, >120 = 50%. */
export function recencyWeight(daysAgo: number): number {
  if (daysAgo <= 30) return 1.0;
  if (daysAgo <= 60) return 0.85;
  if (daysAgo <= 120) return 0.7;
  return 0.5;
}

export function daysBetween(dateStr: string, referenceDate: string): number {
  const a = new Date(dateStr);
  const b = new Date(referenceDate);
  return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

// --- 7 & 8. Improvement suggestions ---

const REALISTIC_INCREMENTS_KG = [0.5, 1, 2, 2.5, 5];
const MAX_SUGGESTED_INCREASE_KG = 15;

/**
 * Round a weight increase to the nearest realistic increment (0.5, 1, 2, 2.5, 5 kg).
 * Never suggest more than 15 kg.
 */
export function roundToRealisticIncrement(kg: number): number | null {
  if (kg <= 0) return null;
  if (kg > MAX_SUGGESTED_INCREASE_KG) return null;
  let best = REALISTIC_INCREMENTS_KG[0];
  for (const inc of REALISTIC_INCREMENTS_KG) {
    if (inc >= kg) return inc;
    best = inc;
  }
  return Math.min(MAX_SUGGESTED_INCREASE_KG, Math.round(kg * 2) / 2);
}

export type WeightIncreaseSuggestion = {
  exerciseName: string;
  exerciseId: string;
  current1RM: number;
  required1RM: number;
  increaseKg: number;
  /** Display label e.g. "+3 kg" */
  label: string;
};

/**
 * For a muscle with current score and target (next rank) score, compute weight
 * increase suggestions for top exercises. Increases are rounded to realistic
 * increments (0.5, 1, 2, 2.5, 5 kg); displayed cap is 15 kg so all muscles
 * show the same "+X kg" format (exercises needing >15 kg show "+15 kg").
 */
export function getWeightIncreaseSuggestions(
  bodyweightKg: number,
  currentMuscleScore: number,
  nextRankScore: number,
  exercises: { exerciseId: string; name: string; estimated1RM: number; multiplier: number }[]
): WeightIncreaseSuggestion[] {
  if (bodyweightKg <= 0 || nextRankScore <= currentMuscleScore || exercises.length === 0)
    return [];
  const suggestions: WeightIncreaseSuggestion[] = [];
  for (const ex of exercises) {
    if (ex.multiplier <= 0) continue;
    const required1RM = (nextRankScore * bodyweightKg) / ex.multiplier;
    const weightIncrease = required1RM - ex.estimated1RM;
    if (weightIncrease <= 0) continue;
    const rounded = roundToRealisticIncrement(weightIncrease);
    const displayKg = rounded != null ? rounded : MAX_SUGGESTED_INCREASE_KG;
    const label = rounded != null ? `+${rounded} kg` : `+${MAX_SUGGESTED_INCREASE_KG} kg`;
    suggestions.push({
      exerciseId: ex.exerciseId,
      exerciseName: ex.name,
      current1RM: ex.estimated1RM,
      required1RM,
      increaseKg: displayKg,
      label,
    });
  }
  return suggestions;
}

// --- 9. Rank progress (exposed via strengthScoreToRank) ---
// progressToNextPct already in strengthScoreToRank.

// --- 10. Core scoring (reps/time) ---

/** Core exercise score: sit-ups = reps/40, plank = seconds/60, hanging leg raise = reps/20, weighted = weight/bw. */
export function coreExerciseScore(
  type: "situps" | "plank" | "hanging_leg_raise" | "weighted",
  value: number,
  bodyweightKg: number
): number {
  if (type === "plank") return value / 60;
  if (type === "situps") return value / 40;
  if (type === "hanging_leg_raise") return value / 20;
  if (bodyweightKg <= 0) return 0;
  return value / bodyweightKg;
}

/** Core muscle score = average of top 3 core exercise scores. */
export function coreMuscleScoreFromTop3(scores: number[]): number {
  const top3 = [...scores].filter((s) => s > 0).sort((a, b) => b - a).slice(0, 3);
  if (top3.length === 0) return 0;
  const sum = top3.reduce((a, b) => a + b, 0);
  return Math.round((sum / top3.length) * 100) / 100;
}

// --- Output types ---

export type MuscleRankOutput = {
  strengthScore: number;
  rank: string;
  tier: "I" | "II" | "III";
  rankLabel: string;
  rankSlug: string;
  progressToNextPct: number;
  nextRankLabel: string | null;
  /** "Top X%" (1-100) for display. */
  topPercentile: number;
};

export type StrengthRankingOutput = {
  muscleScores: Record<StrengthRankMuscle, number>;
  muscleRanks: Record<StrengthRankMuscle, MuscleRankOutput>;
  /** Backward compat: percentile from muscle score (0–100) for "Top X%" display. */
  musclePercentiles: Record<StrengthRankMuscle, number>;
  overallScore: number;
  overallRank: string;
  overallRankLabel: string;
  overallRankSlug: string;
  overallProgressToNextPct: number;
  overallNextRankLabel: string | null;
  /** Next rank slug for badge (e.g. "elite"). */
  overallNextRankSlug: string | null;
  /** Backward compatibility: overall score mapped to 0–100 for UI that expects percentile. */
  overallPercentile: number;
};

// --- Input: exercise data with recency ---

export type ExerciseDataPoint = {
  exerciseId: string;
  exerciseName: string;
  categoryName: string;
  /** Estimated 1RM (kg), already adjusted for unilateral if needed. */
  estimated1RM: number;
  /** Date of the workout (YYYY-MM-DD) for recency. */
  date: string;
};

export type StrengthRankingInput = {
  /** Per-exercise data points (can be multiple per exercise for recency weighting). */
  exerciseDataPoints: ExerciseDataPoint[];
  bodyweightKg: number;
  /** Reference date for recency (e.g. today). */
  referenceDate: string;
  /** Optional core score (average of top 3 core exercises). */
  coreScore?: number | null;
};

function defaultStrengthRankingOutput(): StrengthRankingOutput {
  const muscleScores = Object.fromEntries(
    STRENGTH_RANK_MUSCLES.map((m) => [m, 0])
  ) as Record<StrengthRankMuscle, number>;
  const musclePercentiles = Object.fromEntries(
    STRENGTH_RANK_MUSCLES.map((m) => [m, 0])
  ) as Record<StrengthRankMuscle, number>;
  const muscleRanks = Object.fromEntries(
    STRENGTH_RANK_MUSCLES.map((m) => [
      m,
      {
        strengthScore: 0,
        rank: "Newbie",
        tier: "III",
        rankLabel: "Newbie III",
        rankSlug: "newbie",
        progressToNextPct: 0,
        nextRankLabel: "Starter I",
        topPercentile: 90,
      } as MuscleRankOutput,
    ])
  ) as Record<StrengthRankMuscle, MuscleRankOutput>;
  return {
    muscleScores,
    muscleRanks,
    musclePercentiles,
    overallScore: 0,
    overallRank: "Newbie",
    overallRankLabel: "Newbie I",
    overallRankSlug: "newbie",
    overallProgressToNextPct: 0,
    overallNextRankLabel: "Starter I",
    overallNextRankSlug: "starter",
    overallPercentile: 0,
  };
}

/** Map overall strength score to 0–100 so getRank(percentile) in rankBadges matches score-based rank. */
export function scoreToPercentile(score: number): number {
  if (score <= 0) return 0;
  const maxScore = 2.05;
  const pct = (score / maxScore) * 100;
  return Math.min(99, Math.round(pct));
}

/**
 * Compute Liftly strength ranking from exercise data points (with recency),
 * bodyweight, and optional core score.
 */
export function computeStrengthRanking(input: StrengthRankingInput): StrengthRankingOutput {
  const { exerciseDataPoints, bodyweightKg, referenceDate, coreScore } = input;
  const bodyweight = bodyweightKg > 0 ? bodyweightKg : 1;

  // Build per-exercise recency-weighted best score (score = (1RM/bw)*mult*recency, take max per exercise)
  const multiplierByKey = new Map<string, number>();
  const nameByKey = new Map<string, string>();
  const categoryByKey = new Map<string, string>();
  const scoreByExercise = new Map<string, number>();
  const estimated1RMByExercise = new Map<string, number>();

  for (const pt of exerciseDataPoints) {
    const key = pt.exerciseId;
    nameByKey.set(key, pt.exerciseName);
    categoryByKey.set(key, pt.categoryName);
    if (!multiplierByKey.has(key))
      multiplierByKey.set(key, getExerciseMultiplier(pt.exerciseName, pt.categoryName));
    const mult = multiplierByKey.get(key)!;
    const daysAgo = daysBetween(pt.date, referenceDate);
    const recency = recencyWeight(daysAgo);
    const rawScore = (pt.estimated1RM / bodyweight) * mult * recency;
    const current = scoreByExercise.get(key) ?? 0;
    if (rawScore > current) {
      scoreByExercise.set(key, rawScore);
      estimated1RMByExercise.set(key, pt.estimated1RM);
    }
  }

  // Group by muscle (non-core)
  const scoresByMuscle: Record<StrengthRankMuscle, { score: number; exerciseId: string; name: string; estimated1RM: number; multiplier: number }[]> = {
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

  for (const [exerciseId, score] of scoreByExercise) {
    if (score <= 0) continue;
    const categoryName = categoryByKey.get(exerciseId) ?? "";
    const muscles = categoryToStrengthMuscles(categoryName).filter((m) => m !== "core");
    const multiplier = multiplierByKey.get(exerciseId) ?? DEFAULT_EXERCISE_MULTIPLIER;
    const estimated1RM = estimated1RMByExercise.get(exerciseId) ?? 0;
    const name = nameByKey.get(exerciseId) ?? "";
    for (const m of muscles) {
      scoresByMuscle[m].push({ score, exerciseId, name, estimated1RM, multiplier });
    }
  }

  const muscleScores = {} as Record<StrengthRankMuscle, number>;
  const muscleRanks = {} as Record<StrengthRankMuscle, MuscleRankOutput>;

  for (const m of STRENGTH_RANK_MUSCLES) {
    if (m === "core") {
      muscleScores.core =
        coreScore != null && Number.isFinite(coreScore)
          ? Math.max(0, Math.round(coreScore * 100) / 100)
          : 0;
    } else {
      const list = scoresByMuscle[m].map((x) => x.score);
      muscleScores[m] = muscleScoreFromTopExercises(list);
    }
    const score = muscleScores[m];
    const rankInfo = strengthScoreToRank(score, m);
    const thresholds = getThresholdsForMuscle(m);
    const nextLabel =
      rankInfo.nextThreshold != null
        ? (thresholds.find((t) => t.score === rankInfo.nextThreshold)?.rank ?? "") + " I"
        : null;
    muscleRanks[m] = {
      strengthScore: score,
      rank: rankInfo.rank,
      tier: rankInfo.tier,
      rankLabel: rankInfo.rankLabel,
      rankSlug: rankInfo.rankSlug,
      progressToNextPct: rankInfo.progressToNextPct,
      nextRankLabel: nextLabel,
      topPercentile: rankInfo.topPercentile,
    };
  }

  const musclePercentiles = {} as Record<StrengthRankMuscle, number>;
  for (const m of STRENGTH_RANK_MUSCLES) {
    musclePercentiles[m] = muscleRanks[m].topPercentile;
  }

  const primaryTopPcts = PRIMARY_STRENGTH_RANK_MUSCLES.map((m) => muscleRanks[m].topPercentile);
  const overallTopPercentile =
    primaryTopPcts.length > 0
      ? Math.round(
          primaryTopPcts.reduce((a, b) => a + b, 0) / primaryTopPcts.length
        )
      : 90;
  const overallRankInfo = percentileToRankAndTier(overallTopPercentile);
  const primaryScores = PRIMARY_STRENGTH_RANK_MUSCLES.map((m) => muscleScores[m]);
  const overallScore =
    primaryScores.length > 0
      ? Math.round(
          (primaryScores.reduce((a, b) => a + b, 0) / primaryScores.length) * 100
        ) / 100
      : 0;
  const currentRankIndex = RANK_ORDER.indexOf(overallRankInfo.rank as (typeof RANK_ORDER)[number]);
  const nextRankEntry = currentRankIndex >= 0 && currentRankIndex < RANK_ORDER.length - 1
    ? PERCENTILE_RANGES_BY_RANK[currentRankIndex + 1]
    : null;
  const overallNextRankLabel = nextRankEntry ? `${nextRankEntry.rank} I` : null;
  const overallNextRankSlug = nextRankEntry ? rankToSlug(nextRankEntry.rank) : null;

  return {
    muscleScores,
    muscleRanks,
    musclePercentiles,
    overallScore,
    overallRank: overallRankInfo.rank,
    overallRankLabel: overallRankInfo.rankLabel,
    overallRankSlug: overallRankInfo.rankSlug,
    overallProgressToNextPct: overallRankInfo.progressToNextPct,
    overallNextRankLabel,
    overallNextRankSlug,
    overallPercentile: overallTopPercentile,
  };
}

/** Map "Top X%" percentile to rank and tier (global brackets). III = bottom third, I = top. */
function percentileToRankAndTier(topPct: number): {
  rank: string;
  tier: "I" | "II" | "III";
  rankLabel: string;
  rankSlug: string;
  progressToNextPct: number;
} {
  const clamped = Math.max(1, Math.min(100, topPct));
  for (let i = 0; i < PERCENTILE_RANGES_BY_RANK.length; i++) {
    const { rank, minPct, maxPct } = PERCENTILE_RANGES_BY_RANK[i];
    if (clamped <= maxPct && clamped >= minPct) {
      const width = maxPct - minPct;
      const progressInBand = width > 0 ? (clamped - minPct) / width : 0;
      const third = 1 / 3;
      let tier: "I" | "II" | "III";
      if (progressInBand < third) tier = "III";
      else if (progressInBand < 2 * third) tier = "II";
      else tier = "I";
      const tierStart = minPct + (tier === "III" ? 0 : tier === "II" ? third * width : 2 * third * width);
      const tierEnd = minPct + (tier === "III" ? third * width : tier === "II" ? 2 * third * width : width);
      const progressToNextPct =
        tierEnd > tierStart
          ? Math.round(((clamped - tierStart) / (tierEnd - tierStart)) * 100)
          : 100;
      const rankLabel = rank === "GOAT" ? "GOAT 🐐" : `${rank} ${tier}`;
      return {
        rank,
        tier,
        rankLabel,
        rankSlug: rankToSlug(rank),
        progressToNextPct: Math.min(100, Math.max(0, progressToNextPct)),
      };
    }
  }
  const last = PERCENTILE_RANGES_BY_RANK[PERCENTILE_RANGES_BY_RANK.length - 1];
  return {
    rank: last.rank,
    tier: "I",
    rankLabel: last.rank === "GOAT" ? "GOAT 🐐" : `${last.rank} I`,
    rankSlug: rankToSlug(last.rank),
    progressToNextPct: 100,
  };
}

/** Get top exercises per muscle (by score) for improvement UI. Includes multiplier and estimated1RM. */
export function getTopExercisesByMuscleForSuggestions(
  exerciseDataPoints: ExerciseDataPoint[],
  bodyweightKg: number,
  referenceDate: string
): Record<
  StrengthRankMuscle,
  { exerciseId: string; name: string; estimated1RM: number; multiplier: number; score: number }[]
> {
  const out = {} as Record<
    StrengthRankMuscle,
    { exerciseId: string; name: string; estimated1RM: number; multiplier: number; score: number }[]
  >;
  for (const m of STRENGTH_RANK_MUSCLES) {
    out[m] = [];
  }
  const multiplierByKey = new Map<string, number>();
  const scoreByExercise = new Map<string, { score: number; estimated1RM: number }>();
  for (const pt of exerciseDataPoints) {
    const mult = getExerciseMultiplier(pt.exerciseName, pt.categoryName);
    multiplierByKey.set(pt.exerciseId, mult);
    const daysAgo = daysBetween(pt.date, referenceDate);
    const recency = recencyWeight(daysAgo);
    const score = (pt.estimated1RM / (bodyweightKg || 1)) * mult * recency;
    const cur = scoreByExercise.get(pt.exerciseId);
    if (!cur || score > cur.score) {
      scoreByExercise.set(pt.exerciseId, { score, estimated1RM: pt.estimated1RM });
    }
  }
  const categoryByExercise = new Map<string, string>();
  const nameByExercise = new Map<string, string>();
  for (const pt of exerciseDataPoints) {
    categoryByExercise.set(pt.exerciseId, pt.categoryName);
    nameByExercise.set(pt.exerciseId, pt.exerciseName);
  }
  const byMuscle = new Map<StrengthRankMuscle, { exerciseId: string; name: string; estimated1RM: number; multiplier: number; score: number }[]>();
  for (const m of STRENGTH_RANK_MUSCLES) byMuscle.set(m, []);
  for (const [exerciseId, { score, estimated1RM }] of scoreByExercise) {
    const categoryName = categoryByExercise.get(exerciseId) ?? "";
    const muscles = categoryToStrengthMuscles(categoryName).filter((m) => m !== "core");
    const multiplier = multiplierByKey.get(exerciseId) ?? DEFAULT_EXERCISE_MULTIPLIER;
    const name = nameByExercise.get(exerciseId) ?? "";
    for (const m of muscles) {
      byMuscle.get(m)!.push({ exerciseId, name, estimated1RM, multiplier, score });
    }
  }
  for (const m of STRENGTH_RANK_MUSCLES) {
    const list = byMuscle.get(m) ?? [];
    list.sort((a, b) => b.score - a.score);
    out[m] = list.slice(0, 3);
  }
  return out;
}
