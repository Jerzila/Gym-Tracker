/**
 * Liftly strength ranking — deterministic ratio-based model.
 * 1RM = weight × (1 + reps / 30); strength_ratio = 1RM / bodyweight (per spec).
 * Muscle score: hybrid of top-3 and full-set averages (3+ exercises); ranks use muscle threshold tables.
 */

import type { RankSlug } from "@/lib/rankBadges";

// --- Muscle groups ---

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

/** Muscles included in weighted overall score (Section 4–5 overall). */
export const OVERALL_RANK_MUSCLES = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "core",
  "forearms",
] as const satisfies readonly StrengthRankMuscle[];

const MUSCLE_WEIGHT: Record<(typeof OVERALL_RANK_MUSCLES)[number], number> = {
  legs: 1.3,
  back: 1.2,
  chest: 1.2,
  shoulders: 1.0,
  triceps: 0.9,
  biceps: 0.9,
  core: 0.8,
  forearms: 0.7,
};

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

// --- Rank steps (threshold = minimum ratio for this rank tier). Match: highest step where score >= threshold. ---

export type RankStep = {
  threshold: number;
  baseRank: (typeof RANK_ORDER)[number];
  tier: "I" | "II" | "III";
  /** Full label e.g. "Pro II" or "GOAT" */
  fullLabel: string;
};

function step(
  threshold: number,
  baseRank: (typeof RANK_ORDER)[number],
  tier: "I" | "II" | "III"
): RankStep {
  const fullLabel = baseRank === "GOAT" ? "GOAT" : `${baseRank} ${tier}`;
  return { threshold, baseRank, tier, fullLabel };
}

/** Ordered from strongest (highest threshold) to weakest. Base ratios × 1.05 (rounded 2dp) for realism vs machine/assisted chest work. */
const CHEST_STEPS: RankStep[] = [
  step(2.42, "GOAT", "I"),
  step(2.31, "Titan", "III"),
  step(2.24, "Titan", "II"),
  step(2.16, "Titan", "I"),
  step(2.1, "Grandmaster", "III"),
  step(2.04, "Grandmaster", "II"),
  step(1.97, "Grandmaster", "I"),
  step(1.92, "Master", "III"),
  step(1.87, "Master", "II"),
  step(1.82, "Master", "I"),
  step(1.73, "Elite", "III"),
  step(1.66, "Elite", "II"),
  step(1.59, "Elite", "I"),
  step(1.52, "Pro", "III"),
  step(1.47, "Pro", "II"),
  step(1.42, "Pro", "I"),
  step(1.31, "Semi-Pro", "III"),
  step(1.22, "Semi-Pro", "II"),
  step(1.13, "Semi-Pro", "I"),
  step(1.05, "Lifter", "III"),
  step(0.97, "Lifter", "II"),
  step(0.88, "Lifter", "I"),
  step(0.79, "Apprentice", "III"),
  step(0.72, "Apprentice", "II"),
  step(0.66, "Apprentice", "I"),
  step(0.61, "Starter", "III"),
  step(0.57, "Starter", "II"),
  step(0.53, "Starter", "I"),
  step(0.47, "Newbie", "III"),
  step(0.37, "Newbie", "II"),
  step(0.26, "Newbie", "I"),
];

const BACK_STEPS: RankStep[] = [
  step(2.1, "GOAT", "I"),
  step(1.98, "Titan", "III"),
  step(1.9, "Titan", "II"),
  step(1.83, "Titan", "I"),
  step(1.75, "Grandmaster", "III"),
  step(1.68, "Grandmaster", "II"),
  step(1.62, "Grandmaster", "I"),
  step(1.58, "Master", "III"),
  step(1.53, "Master", "II"),
  step(1.48, "Master", "I"),
  step(1.4, "Elite", "III"),
  step(1.33, "Elite", "II"),
  step(1.26, "Elite", "I"),
  step(1.15, "Pro", "III"),
  step(1.1, "Pro", "II"),
  step(1.05, "Pro", "I"),
  step(1.0, "Semi-Pro", "III"),
  step(0.94, "Semi-Pro", "II"),
  step(0.88, "Semi-Pro", "I"),
  step(0.82, "Lifter", "III"),
  step(0.77, "Lifter", "II"),
  step(0.72, "Lifter", "I"),
  step(0.65, "Apprentice", "III"),
  step(0.6, "Apprentice", "II"),
  step(0.55, "Apprentice", "I"),
  step(0.5, "Starter", "III"),
  step(0.46, "Starter", "II"),
  step(0.42, "Starter", "I"),
  step(0.38, "Newbie", "III"),
  step(0.3, "Newbie", "II"),
  step(0.2, "Newbie", "I"),
];

const SHOULDERS_STEPS: RankStep[] = [
  step(1.65, "GOAT", "I"),
  step(1.56, "Titan", "III"),
  step(1.5, "Titan", "II"),
  step(1.45, "Titan", "I"),
  step(1.4, "Grandmaster", "III"),
  step(1.34, "Grandmaster", "II"),
  step(1.28, "Grandmaster", "I"),
  step(1.23, "Master", "III"),
  step(1.18, "Master", "II"),
  step(1.13, "Master", "I"),
  step(1.05, "Elite", "III"),
  step(1.0, "Elite", "II"),
  step(0.95, "Elite", "I"),
  step(0.9, "Pro", "III"),
  step(0.87, "Pro", "II"),
  step(0.84, "Pro", "I"),
  step(0.8, "Semi-Pro", "III"),
  step(0.75, "Semi-Pro", "II"),
  step(0.7, "Semi-Pro", "I"),
  step(0.65, "Lifter", "III"),
  step(0.6, "Lifter", "II"),
  step(0.55, "Lifter", "I"),
  step(0.5, "Apprentice", "III"),
  step(0.45, "Apprentice", "II"),
  step(0.4, "Apprentice", "I"),
  step(0.35, "Starter", "III"),
  step(0.3, "Starter", "II"),
  step(0.25, "Starter", "I"),
  step(0.2, "Newbie", "III"),
  step(0.15, "Newbie", "II"),
  step(0.1, "Newbie", "I"),
];

/** Base ratios × 0.95 (rounded 2dp); slightly easier tiers for isolation curl progression. */
const BICEPS_STEPS: RankStep[] = [
  step(1.33, "GOAT", "I"),
  step(1.24, "Titan", "III"),
  step(1.19, "Titan", "II"),
  step(1.14, "Titan", "I"),
  step(1.09, "Grandmaster", "III"),
  step(1.05, "Grandmaster", "II"),
  step(1.0, "Grandmaster", "I"),
  step(0.96, "Master", "III"),
  step(0.91, "Master", "II"),
  step(0.86, "Master", "I"),
  step(0.81, "Elite", "III"),
  step(0.75, "Elite", "II"),
  step(0.7, "Elite", "I"),
  step(0.66, "Pro", "III"),
  step(0.64, "Pro", "II"),
  step(0.61, "Pro", "I"),
  step(0.57, "Semi-Pro", "III"),
  step(0.52, "Semi-Pro", "II"),
  step(0.48, "Semi-Pro", "I"),
  step(0.46, "Lifter", "III"),
  step(0.42, "Lifter", "II"),
  step(0.38, "Lifter", "I"),
  step(0.33, "Apprentice", "III"),
  step(0.28, "Apprentice", "II"),
  step(0.24, "Apprentice", "I"),
  step(0.2, "Starter", "III"),
  step(0.17, "Starter", "II"),
  step(0.14, "Starter", "I"),
  step(0.11, "Newbie", "III"),
  step(0.08, "Newbie", "II"),
  step(0.05, "Newbie", "I"),
];

/** Base ratios × 1.08 (rounded 2dp); stricter vs dip-machine–inflated loads. */
const TRICEPS_STEPS: RankStep[] = [
  step(1.46, "GOAT", "I"),
  step(1.37, "Titan", "III"),
  step(1.31, "Titan", "II"),
  step(1.24, "Titan", "I"),
  step(1.19, "Grandmaster", "III"),
  step(1.13, "Grandmaster", "II"),
  step(1.08, "Grandmaster", "I"),
  step(1.04, "Master", "III"),
  step(0.98, "Master", "II"),
  step(0.93, "Master", "I"),
  step(0.86, "Elite", "III"),
  step(0.8, "Elite", "II"),
  step(0.75, "Elite", "I"),
  step(0.7, "Pro", "III"),
  step(0.67, "Pro", "II"),
  step(0.64, "Pro", "I"),
  step(0.59, "Semi-Pro", "III"),
  step(0.55, "Semi-Pro", "II"),
  step(0.52, "Semi-Pro", "I"),
  step(0.49, "Lifter", "III"),
  step(0.44, "Lifter", "II"),
  step(0.41, "Lifter", "I"),
  step(0.37, "Apprentice", "III"),
  step(0.31, "Apprentice", "II"),
  step(0.26, "Apprentice", "I"),
  step(0.22, "Starter", "III"),
  step(0.18, "Starter", "II"),
  step(0.15, "Starter", "I"),
  step(0.11, "Newbie", "III"),
  step(0.09, "Newbie", "II"),
  step(0.05, "Newbie", "I"),
];

const LEGS_STEPS: RankStep[] = [
  step(3.25, "GOAT", "I"),
  step(3.08, "Titan", "III"),
  step(2.97, "Titan", "II"),
  step(2.86, "Titan", "I"),
  step(2.75, "Grandmaster", "III"),
  step(2.67, "Grandmaster", "II"),
  step(2.58, "Grandmaster", "I"),
  step(2.51, "Master", "III"),
  step(2.44, "Master", "II"),
  step(2.36, "Master", "I"),
  step(2.25, "Elite", "III"),
  step(2.13, "Elite", "II"),
  step(2.02, "Elite", "I"),
  step(1.85, "Pro", "III"),
  step(1.76, "Pro", "II"),
  step(1.68, "Pro", "I"),
  step(1.55, "Semi-Pro", "III"),
  step(1.43, "Semi-Pro", "II"),
  step(1.32, "Semi-Pro", "I"),
  step(1.25, "Lifter", "III"),
  step(1.14, "Lifter", "II"),
  step(1.03, "Lifter", "I"),
  step(0.92, "Apprentice", "III"),
  step(0.85, "Apprentice", "II"),
  step(0.78, "Apprentice", "I"),
  step(0.72, "Starter", "III"),
  step(0.67, "Starter", "II"),
  step(0.62, "Starter", "I"),
  step(0.58, "Newbie", "III"),
  step(0.45, "Newbie", "II"),
  step(0.35, "Newbie", "I"),
];

const CORE_STEPS: RankStep[] = [
  step(1.5, "GOAT", "I"),
  step(1.33, "Titan", "III"),
  step(1.22, "Titan", "II"),
  step(1.11, "Titan", "I"),
  step(1.0, "Grandmaster", "III"),
  step(0.94, "Grandmaster", "II"),
  step(0.88, "Grandmaster", "I"),
  step(0.83, "Master", "III"),
  step(0.77, "Master", "II"),
  step(0.71, "Master", "I"),
  step(0.65, "Elite", "III"),
  step(0.59, "Elite", "II"),
  step(0.53, "Elite", "I"),
  step(0.48, "Pro", "III"),
  step(0.44, "Pro", "II"),
  step(0.41, "Pro", "I"),
  step(0.38, "Semi-Pro", "III"),
  step(0.35, "Semi-Pro", "II"),
  step(0.32, "Semi-Pro", "I"),
  step(0.3, "Lifter", "III"),
  step(0.27, "Lifter", "II"),
  step(0.24, "Lifter", "I"),
  step(0.21, "Apprentice", "III"),
  step(0.18, "Apprentice", "II"),
  step(0.15, "Apprentice", "I"),
  step(0.12, "Starter", "III"),
  step(0.09, "Starter", "II"),
  step(0.06, "Starter", "I"),
  step(0.03, "Newbie", "III"),
  step(0.02, "Newbie", "II"),
  step(0.01, "Newbie", "I"),
];

const FOREARMS_STEPS: RankStep[] = [
  step(2.75, "GOAT", "I"),
  step(2.5, "Titan", "III"),
  step(2.33, "Titan", "II"),
  step(2.16, "Titan", "I"),
  step(2.0, "Grandmaster", "III"),
  step(1.88, "Grandmaster", "II"),
  step(1.76, "Grandmaster", "I"),
  step(1.65, "Master", "III"),
  step(1.54, "Master", "II"),
  step(1.43, "Master", "I"),
  step(1.3, "Elite", "III"),
  step(1.18, "Elite", "II"),
  step(1.06, "Elite", "I"),
  step(0.95, "Pro", "III"),
  step(0.89, "Pro", "II"),
  step(0.83, "Pro", "I"),
  step(0.75, "Semi-Pro", "III"),
  step(0.69, "Semi-Pro", "II"),
  step(0.63, "Semi-Pro", "I"),
  step(0.58, "Lifter", "III"),
  step(0.51, "Lifter", "II"),
  step(0.44, "Lifter", "I"),
  step(0.35, "Apprentice", "III"),
  step(0.3, "Apprentice", "II"),
  step(0.25, "Apprentice", "I"),
  step(0.2, "Starter", "III"),
  step(0.16, "Starter", "II"),
  step(0.12, "Starter", "I"),
  step(0.08, "Newbie", "III"),
  step(0.05, "Newbie", "II"),
  step(0.02, "Newbie", "I"),
];

/** Overall rank: thresholds + exact display percentile (Section 6 & 8). */
const OVERALL_STEPS: (RankStep & { topPercentLabel: string })[] = [
  { ...step(2.22, "GOAT", "I"), topPercentLabel: "Top 1%" },
  { ...step(2.1, "Titan", "III"), topPercentLabel: "Top 2%" },
  { ...step(2.01, "Titan", "II"), topPercentLabel: "Top 3%" },
  { ...step(1.94, "Titan", "I"), topPercentLabel: "Top 4%" },
  { ...step(1.88, "Grandmaster", "III"), topPercentLabel: "Top 5%" },
  { ...step(1.82, "Grandmaster", "II"), topPercentLabel: "Top 5.6%" },
  { ...step(1.76, "Grandmaster", "I"), topPercentLabel: "Top 6.3%" },
  { ...step(1.7, "Master", "III"), topPercentLabel: "Top 7%" },
  { ...step(1.6, "Master", "II"), topPercentLabel: "Top 9.6%" },
  { ...step(1.51, "Master", "I"), topPercentLabel: "Top 12.3%" },
  { ...step(1.4, "Elite", "III"), topPercentLabel: "Top 15%" },
  { ...step(1.32, "Elite", "II"), topPercentLabel: "Top 18.3%" },
  { ...step(1.24, "Elite", "I"), topPercentLabel: "Top 21.6%" },
  { ...step(1.15, "Pro", "III"), topPercentLabel: "Top 25%" },
  { ...step(1.08, "Pro", "II"), topPercentLabel: "Top 28.3%" },
  { ...step(1.01, "Pro", "I"), topPercentLabel: "Top 31.6%" },
  { ...step(0.94, "Semi-Pro", "III"), topPercentLabel: "Top 35%" },
  { ...step(0.88, "Semi-Pro", "II"), topPercentLabel: "Top 40%" },
  { ...step(0.82, "Semi-Pro", "I"), topPercentLabel: "Top 45%" },
  { ...step(0.77, "Lifter", "III"), topPercentLabel: "Top 50%" },
  { ...step(0.71, "Lifter", "II"), topPercentLabel: "Top 56.6%" },
  { ...step(0.65, "Lifter", "I"), topPercentLabel: "Top 63.3%" },
  { ...step(0.58, "Apprentice", "III"), topPercentLabel: "Top 70%" },
  { ...step(0.53, "Apprentice", "II"), topPercentLabel: "Top 74%" },
  { ...step(0.48, "Apprentice", "I"), topPercentLabel: "Top 78%" },
  { ...step(0.43, "Starter", "III"), topPercentLabel: "Top 82%" },
  { ...step(0.39, "Starter", "II"), topPercentLabel: "Top 84.6%" },
  { ...step(0.35, "Starter", "I"), topPercentLabel: "Top 87.3%" },
  { ...step(0.31, "Newbie", "III"), topPercentLabel: "Top 90%" },
  { ...step(0.25, "Newbie", "II"), topPercentLabel: "Top 93.3%" },
  { ...step(0.18, "Newbie", "I"), topPercentLabel: "Top 96.6%" },
];

/** Fixed "Top X%" string per rank tier (muscles + overall display; not computed from ranges). */
const EXACT_TOP_PERCENT_BY_RANK_TIER: Record<string, string> = Object.fromEntries(
  OVERALL_STEPS.map((s) => [`${s.baseRank} ${s.tier}`, s.topPercentLabel])
);

export function exactTopPercentileLabelForRankTier(
  baseRank: (typeof RANK_ORDER)[number],
  tier: "I" | "II" | "III"
): string {
  return EXACT_TOP_PERCENT_BY_RANK_TIER[`${baseRank} ${tier}`] ?? "Top 96.6%";
}

export function getStepsForMuscle(muscle: StrengthRankMuscle): RankStep[] {
  switch (muscle) {
    case "chest":
      return CHEST_STEPS;
    case "back":
    case "traps":
      return BACK_STEPS;
    case "legs":
      return LEGS_STEPS;
    case "shoulders":
      return SHOULDERS_STEPS;
    case "biceps":
      return BICEPS_STEPS;
    case "triceps":
      return TRICEPS_STEPS;
    case "forearms":
      return FOREARMS_STEPS;
    case "core":
      return CORE_STEPS;
    default:
      return CHEST_STEPS;
  }
}

export function rankToSlug(rank: string): RankSlug {
  const r = rank.trim().toLowerCase();
  if (r === "semi-pro") return "semi-pro";
  if (r === "goat") return "goat";
  return r.replace(/\s+/g, "-") as RankSlug;
}

function matchStep(score: number, steps: RankStep[]): RankStep {
  for (const s of steps) {
    if (score >= s.threshold) return s;
  }
  const last = steps[steps.length - 1];
  return last;
}

function nextStrongerStep(current: RankStep, steps: RankStep[]): RankStep | null {
  const idx = steps.findIndex(
    (s) => s.threshold === current.threshold && s.baseRank === current.baseRank && s.tier === current.tier
  );
  if (idx <= 0) return null;
  return steps[idx - 1];
}

function progressToNextRank(score: number, current: RankStep, steps: RankStep[]): number {
  const next = nextStrongerStep(current, steps);
  if (!next) return 100;
  const low = current.threshold;
  const high = next.threshold;
  if (high <= low) return 100;
  const p = ((score - low) / (high - low)) * 100;
  return Math.min(100, Math.max(0, Math.round(p)));
}

export function strengthScoreToRank(
  score: number,
  muscle: StrengthRankMuscle
): {
  rank: string;
  tier: "I" | "II" | "III";
  rankLabel: string;
  rankSlug: RankSlug;
  currentThreshold: number;
  nextThreshold: number | null;
  nextRankLabel: string | null;
  progressToNextPct: number;
  topPercentileLabel: string;
} {
  const steps = getStepsForMuscle(muscle);
  const matched = matchStep(Math.max(0, score), steps);
  const next = nextStrongerStep(matched, steps);
  const progressToNextPct = progressToNextRank(Math.max(0, score), matched, steps);
  const topPercentileLabel = exactTopPercentileLabelForRankTier(matched.baseRank, matched.tier);
  return {
    rank: matched.baseRank,
    tier: matched.tier,
    rankLabel: matched.fullLabel,
    rankSlug: rankToSlug(matched.baseRank),
    currentThreshold: matched.threshold,
    nextThreshold: next?.threshold ?? null,
    nextRankLabel: next ? next.fullLabel : null,
    progressToNextPct,
    topPercentileLabel,
  };
}

export function getNextRankThreshold(score: number, muscle: StrengthRankMuscle): number | null {
  const steps = getStepsForMuscle(muscle);
  const asc = [...steps].sort((a, b) => a.threshold - b.threshold);
  for (const s of asc) {
    if (s.threshold > score) return s.threshold;
  }
  return null;
}

export function epleyEstimated1RM(weightKg: number, reps: number): number {
  if (reps <= 0) return weightKg;
  return weightKg * (1 + reps / 30);
}

/**
 * Per-muscle score from exercise strength ratios (one ratio per exercise, best set).
 * 1 lift → that ratio; 2 lifts → mean of both; 3+ → (top3_avg × 0.7) + (all_avg × 0.3).
 * Exercises with ratio ≤ 0 are omitted.
 */
export function muscleScoreFromExerciseRatios(ratios: number[]): number {
  const sorted = [...ratios].filter((r) => r > 0).sort((a, b) => b - a);
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return Math.round(sorted[0] * 10000) / 10000;
  if (sorted.length === 2) {
    const avg = (sorted[0] + sorted[1]) / 2;
    return Math.round(avg * 10000) / 10000;
  }
  const top3 = sorted.slice(0, 3);
  const top3Average = top3.reduce((a, b) => a + b, 0) / 3;
  const allLiftsAverage = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const muscleScore = top3Average * 0.7 + allLiftsAverage * 0.3;
  return Math.round(muscleScore * 10000) / 10000;
}

export type WeightIncreaseSuggestion = {
  exerciseId: string;
  exerciseName: string;
  current1RM: number;
  required1RM: number;
  increaseKg: number;
  label: string;
};

const REALISTIC_INCREMENTS_KG = [0.5, 1, 2, 2.5, 5];
const MAX_SUGGESTED_INCREASE_KG = 15;

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

/** Ratio model: required 1RM = nextThreshold × bodyweight (no equipment multipliers). */
export function getWeightIncreaseSuggestions(
  bodyweightKg: number,
  currentMuscleScore: number,
  nextRankScore: number,
  exercises: { exerciseId: string; name: string; estimated1RM: number }[]
): WeightIncreaseSuggestion[] {
  if (bodyweightKg <= 0 || nextRankScore <= currentMuscleScore || exercises.length === 0) return [];
  const suggestions: WeightIncreaseSuggestion[] = [];
  const required1RM = nextRankScore * bodyweightKg;
  for (const ex of exercises) {
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

export type MuscleRankOutput = {
  strengthScore: number;
  rank: string;
  tier: "I" | "II" | "III";
  rankLabel: string;
  rankSlug: RankSlug;
  progressToNextPct: number;
  nextRankLabel: string | null;
  topPercentileLabel: string;
};

/** Snapshot for dashboard / account rank widgets (deterministic labels from ranking output). */
export type OverallRankDisplaySnapshot = {
  rankSlug: RankSlug;
  tier: "I" | "II" | "III";
  rankLabel: string;
  topPercentileLabel: string;
  nextRankLabel: string;
  nextRankSlug: RankSlug | null;
  nextRankTier: "I" | "II" | "III" | null;
  nextTopPercentileLabel: string | null;
  progressPct: number;
};

export function overallRankDisplayFromOutput(o: StrengthRankingOutput): OverallRankDisplaySnapshot {
  return {
    rankSlug: o.overallRankSlug,
    tier: o.overallTier,
    rankLabel: o.overallRankLabel,
    topPercentileLabel: o.overallTopPercentileLabel,
    nextRankLabel: o.overallNextRankLabel ?? "",
    nextRankSlug: o.overallNextRankSlug,
    nextRankTier: o.overallNextRankTier,
    nextTopPercentileLabel: o.overallNextTopPercentileLabel,
    progressPct: o.overallProgressToNextPct,
  };
}

export type StrengthRankingOutput = {
  muscleScores: Record<StrengthRankMuscle, number>;
  muscleRanks: Record<StrengthRankMuscle, MuscleRankOutput>;
  /** @deprecated Numeric legacy field; prefer topPercentileLabel on muscle ranks. Kept 0 for compatibility. */
  musclePercentiles: Record<StrengthRankMuscle, number>;
  overallScore: number;
  overallRank: string;
  overallRankLabel: string;
  overallRankSlug: RankSlug;
  overallTier: "I" | "II" | "III";
  overallProgressToNextPct: number;
  overallNextRankLabel: string | null;
  overallNextRankSlug: RankSlug | null;
  overallNextRankTier: "I" | "II" | "III" | null;
  /** Exact label e.g. "Top 18.3%" */
  overallTopPercentileLabel: string;
  /** Next rank's Top X% label when applicable. */
  overallNextTopPercentileLabel: string | null;
  /** @deprecated Use overallTopPercentileLabel. */
  overallPercentile: number;
};

export type ExerciseDataPoint = {
  exerciseId: string;
  exerciseName: string;
  categoryName: string;
  /** Muscle this data point contributes to (same exercise may emit multiple points, e.g. farmer carry). */
  forMuscle: StrengthRankMuscle;
  /** Best-effort estimated 1RM (kg) for this set — used for suggestions. */
  estimated1RM: number;
  /** strength_ratio for this set (1RM/bw or forearm farmer rule only on forearms), precomputed in action. */
  strengthRatio: number;
  date: string;
};

export type StrengthRankingInput = {
  exerciseDataPoints: ExerciseDataPoint[];
  bodyweightKg: number;
  coreScore?: number | null;
};

function defaultMuscleRankOutput(): MuscleRankOutput {
  const info = strengthScoreToRank(0, "chest");
  return {
    strengthScore: 0,
    rank: info.rank,
    tier: info.tier,
    rankLabel: info.rankLabel,
    rankSlug: info.rankSlug,
    progressToNextPct: info.progressToNextPct,
    nextRankLabel: info.nextRankLabel,
    topPercentileLabel: info.topPercentileLabel,
  };
}

function matchOverallStep(score: number): (typeof OVERALL_STEPS)[number] {
  for (const s of OVERALL_STEPS) {
    if (score >= s.threshold) return s;
  }
  return OVERALL_STEPS[OVERALL_STEPS.length - 1];
}

/**
 * Canonical overall rank for a stored `rankings.overall_score` (same ladder as Insights / recalculate).
 * Use for social leaderboard ordering and display so badge, label, and "Top X%" stay in sync.
 */
export function overallRankFromScore(overallScore: number): {
  /** Lower = stronger (0 = best step: GOAT). */
  ladderIndex: number;
  rankLabel: string;
  rankSlug: RankSlug;
  tier: "I" | "II" | "III";
  topPercentileLabel: string;
} {
  const matched = matchOverallStep(Math.max(0, overallScore));
  const idx = OVERALL_STEPS.findIndex(
    (s) => s.baseRank === matched.baseRank && s.tier === matched.tier
  );
  const ladderIndex = idx >= 0 ? idx : OVERALL_STEPS.length - 1;
  return {
    ladderIndex,
    rankLabel: matched.fullLabel,
    rankSlug: rankToSlug(matched.baseRank),
    tier: matched.tier,
    topPercentileLabel: matched.topPercentLabel,
  };
}

function nextOverallStep(current: (typeof OVERALL_STEPS)[number]): (typeof OVERALL_STEPS)[number] | null {
  const idx = OVERALL_STEPS.findIndex(
    (s) =>
      s.threshold === current.threshold &&
      s.baseRank === current.baseRank &&
      s.tier === current.tier
  );
  if (idx <= 0) return null;
  return OVERALL_STEPS[idx - 1];
}

function defaultStrengthRankingOutput(): StrengthRankingOutput {
  const muscleScores = Object.fromEntries(
    STRENGTH_RANK_MUSCLES.map((m) => [m, 0])
  ) as Record<StrengthRankMuscle, number>;
  const musclePercentiles = Object.fromEntries(
    STRENGTH_RANK_MUSCLES.map((m) => [m, 0])
  ) as Record<StrengthRankMuscle, number>;
  const muscleRanks = Object.fromEntries(
    STRENGTH_RANK_MUSCLES.map((m) => [m, defaultMuscleRankOutput()])
  ) as Record<StrengthRankMuscle, MuscleRankOutput>;
  const last = OVERALL_STEPS[OVERALL_STEPS.length - 1];
  const next = OVERALL_STEPS[OVERALL_STEPS.length - 2];
  return {
    muscleScores,
    muscleRanks,
    musclePercentiles,
    overallScore: 0,
    overallRank: last.baseRank,
    overallRankLabel: last.fullLabel,
    overallRankSlug: rankToSlug(last.baseRank),
    overallTier: last.tier,
    overallProgressToNextPct: 0,
    overallNextRankLabel: next.fullLabel,
    overallNextRankSlug: rankToSlug(next.baseRank),
    overallNextRankTier: next.tier,
    overallTopPercentileLabel: last.topPercentLabel,
    overallNextTopPercentileLabel: next.topPercentLabel,
    overallPercentile: 0,
  };
}

export function computeStrengthRanking(input: StrengthRankingInput): StrengthRankingOutput {
  const { exerciseDataPoints, coreScore } = input;

  const bestByExerciseMuscle = new Map<
    string,
    { ratio: number; estimated1RM: number; name: string }
  >();

  for (const pt of exerciseDataPoints) {
    if (pt.forMuscle === "core") continue;
    const mapKey = `${pt.exerciseId}:${pt.forMuscle}`;
    const cur = bestByExerciseMuscle.get(mapKey);
    if (!cur || pt.strengthRatio > cur.ratio) {
      bestByExerciseMuscle.set(mapKey, {
        ratio: pt.strengthRatio,
        estimated1RM: pt.estimated1RM,
        name: pt.exerciseName,
      });
    }
  }

  const scoresByMuscle: Record<StrengthRankMuscle, { exerciseId: string; name: string; ratio: number; estimated1RM: number }[]> = {
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

  for (const [mapKey, val] of bestByExerciseMuscle) {
    if (val.ratio <= 0) continue;
    const colon = mapKey.indexOf(":");
    const exerciseId = mapKey.slice(0, colon);
    const m = mapKey.slice(colon + 1) as StrengthRankMuscle;
    scoresByMuscle[m].push({
      exerciseId,
      name: val.name,
      ratio: val.ratio,
      estimated1RM: val.estimated1RM,
    });
  }

  const muscleScores = {} as Record<StrengthRankMuscle, number>;
  const muscleRanks = {} as Record<StrengthRankMuscle, MuscleRankOutput>;
  const musclePercentiles = {} as Record<StrengthRankMuscle, number>;

  for (const m of STRENGTH_RANK_MUSCLES) {
    if (m === "core") {
      const s =
        coreScore != null && Number.isFinite(coreScore) ? Math.max(0, Math.round(coreScore * 10000) / 10000) : 0;
      muscleScores.core = s;
    } else {
      const list = scoresByMuscle[m];
      muscleScores[m] = muscleScoreFromExerciseRatios(list.map((x) => x.ratio));
    }

    const score = muscleScores[m];
    const rankInfo = strengthScoreToRank(score, m);

    muscleRanks[m] = {
      strengthScore: score,
      rank: rankInfo.rank,
      tier: rankInfo.tier,
      rankLabel: rankInfo.rankLabel,
      rankSlug: rankInfo.rankSlug,
      progressToNextPct: rankInfo.progressToNextPct,
      nextRankLabel: rankInfo.nextRankLabel,
      topPercentileLabel: rankInfo.topPercentileLabel,
    };
    musclePercentiles[m] = 0;
  }

  let weightedSum = 0;
  let weightTotal = 0;
  for (const m of OVERALL_RANK_MUSCLES) {
    const s = muscleScores[m];
    if (s <= 0) continue;
    const w = MUSCLE_WEIGHT[m];
    weightedSum += s * w;
    weightTotal += w;
  }

  const overallScore =
    weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 10000) / 10000 : 0;

  const overallMatched = matchOverallStep(Math.max(0, overallScore));
  const overallNext = nextOverallStep(overallMatched);
  const overallStepsCore: RankStep[] = OVERALL_STEPS.map(
    ({ threshold, baseRank, tier, fullLabel }) => ({ threshold, baseRank, tier, fullLabel })
  );
  const overallProgressToNextPct = progressToNextRank(
    Math.max(0, overallScore),
    overallMatched,
    overallStepsCore
  );

  return {
    muscleScores,
    muscleRanks,
    musclePercentiles,
    overallScore,
    overallRank: overallMatched.baseRank,
    overallRankLabel: overallMatched.fullLabel,
    overallRankSlug: rankToSlug(overallMatched.baseRank),
    overallTier: overallMatched.tier,
    overallProgressToNextPct,
    overallNextRankLabel: overallNext?.fullLabel ?? null,
    overallNextRankSlug: overallNext ? rankToSlug(overallNext.baseRank) : null,
    overallNextRankTier: overallNext?.tier ?? null,
    overallTopPercentileLabel: overallMatched.topPercentLabel,
    overallNextTopPercentileLabel: overallNext?.topPercentLabel ?? null,
    overallPercentile: 0,
  };
}

export function getTopExercisesByMuscleForSuggestions(
  exerciseDataPoints: ExerciseDataPoint[]
): Record<
  StrengthRankMuscle,
  { exerciseId: string; name: string; estimated1RM: number; ratio: number }[]
> {
  const bestByExerciseMuscle = new Map<
    string,
    { ratio: number; estimated1RM: number; name: string }
  >();

  for (const pt of exerciseDataPoints) {
    if (pt.forMuscle === "core") continue;
    const mapKey = `${pt.exerciseId}:${pt.forMuscle}`;
    const cur = bestByExerciseMuscle.get(mapKey);
    if (!cur || pt.strengthRatio > cur.ratio) {
      bestByExerciseMuscle.set(mapKey, {
        ratio: pt.strengthRatio,
        estimated1RM: pt.estimated1RM,
        name: pt.exerciseName,
      });
    }
  }

  const byMuscle = new Map<
    StrengthRankMuscle,
    { exerciseId: string; name: string; estimated1RM: number; ratio: number }[]
  >();
  for (const m of STRENGTH_RANK_MUSCLES) byMuscle.set(m, []);

  for (const [mapKey, val] of bestByExerciseMuscle) {
    if (val.ratio <= 0) continue;
    const colon = mapKey.indexOf(":");
    const exerciseId = mapKey.slice(0, colon);
    const m = mapKey.slice(colon + 1) as StrengthRankMuscle;
    byMuscle.get(m)!.push({
      exerciseId,
      name: val.name,
      estimated1RM: val.estimated1RM,
      ratio: val.ratio,
    });
  }

  const out = {} as Record<
    StrengthRankMuscle,
    { exerciseId: string; name: string; estimated1RM: number; ratio: number }[]
  >;
  for (const m of STRENGTH_RANK_MUSCLES) {
    const list = byMuscle.get(m) ?? [];
    list.sort((a, b) => b.ratio - a.ratio);
    out[m] = list.slice(0, 3);
  }
  return out;
}

/** Legacy export for any stray imports */
export const STRENGTH_SCORE_THRESHOLDS = CHEST_STEPS.map((s) => ({
  score: s.threshold,
  rank: s.baseRank,
}));
