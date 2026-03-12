/**
 * Liftly Strength Ranking System
 *
 * Computes muscle strength percentiles and ranks from estimated 1RM, bodyweight
 * normalization, and external strength models so rankings work even with few users.
 */

// --- Strength rank muscle groups (5 groups for diagram and ranks) ---

export const STRENGTH_RANK_MUSCLES = ["chest", "back", "legs", "shoulders", "arms"] as const;
export type StrengthRankMuscle = (typeof STRENGTH_RANK_MUSCLES)[number];

/** Map category name (e.g. from exercises) to one or more strength rank muscles. */
export function categoryToStrengthMuscles(categoryName: string): StrengthRankMuscle[] {
  const name = categoryName.trim().toLowerCase();
  if (!name) return [];
  if (name.includes("chest")) return ["chest"];
  if (name.includes("back") || name.includes("lat")) return ["back"];
  if (name.includes("shoulder")) return ["shoulders"];
  if (name.includes("bicep") || name.includes("tricep")) return ["arms"];
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
  if (name.includes("upper body")) return ["chest", "back", "shoulders", "arms"];
  if (name.includes("core") || name.includes("abs") || name.includes("oblique")) return [];
  return [];
}

// --- SECTION 1 & 2: Exercise and muscle strength scores ---

/** Normalized strength score for one exercise: estimated1RM / bodyweight */
export function exerciseStrengthScore(estimated1RMKg: number, bodyweightKg: number): number {
  if (bodyweightKg <= 0) return 0;
  return Math.round((estimated1RMKg / bodyweightKg) * 100) / 100;
}

/**
 * Compute muscle strength score as average of normalized exercise scores
 * for all exercises that map to that muscle.
 */
export function muscleStrengthScores(
  exerciseScores: { exerciseId: string; score: number; categoryName: string }[]
): Record<StrengthRankMuscle, number> {
  const scoresByMuscle: Record<StrengthRankMuscle, number[]> = {
    chest: [],
    back: [],
    legs: [],
    shoulders: [],
    arms: [],
  };
  for (const { score, categoryName } of exerciseScores) {
    const muscles = categoryToStrengthMuscles(categoryName);
    for (const m of muscles) {
      scoresByMuscle[m].push(score);
    }
  }
  const out = {} as Record<StrengthRankMuscle, number>;
  for (const m of STRENGTH_RANK_MUSCLES) {
    const arr = scoresByMuscle[m];
    out[m] =
      arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0;
  }
  return out;
}

// --- SECTION 3: Expected strength model (external baseline ratios) ---

export type StrengthLevel = "beginner" | "novice" | "intermediate" | "advanced" | "elite";

/** Reference strength ratios (strengthScore = 1RM / bodyweight) per muscle. */
export const EXPECTED_STRENGTH_RATIOS: Record<StrengthRankMuscle, Record<StrengthLevel, number>> = {
  chest: { beginner: 0.7, novice: 0.9, intermediate: 1.1, advanced: 1.35, elite: 1.7 },
  back: { beginner: 0.7, novice: 0.9, intermediate: 1.1, advanced: 1.35, elite: 1.7 },
  legs: { beginner: 0.9, novice: 1.15, intermediate: 1.4, advanced: 1.7, elite: 2.1 },
  shoulders: { beginner: 0.4, novice: 0.55, intermediate: 0.7, advanced: 0.85, elite: 1.05 },
  arms: { beginner: 0.35, novice: 0.45, intermediate: 0.55, advanced: 0.7, elite: 0.85 },
};

function getEliteScore(muscle: StrengthRankMuscle): number {
  return EXPECTED_STRENGTH_RATIOS[muscle].elite;
}

// --- SECTION 4: Percentile estimation (model curve) ---

/**
 * Convert muscleScore into a percentile using model curve.
 * percentile = 100 × (muscleScore / eliteScore)^0.7
 * Clamped between 0 and 100.
 */
export function modelPercentileFromScore(
  muscleScore: number,
  eliteScore: number
): number {
  if (eliteScore <= 0) return 0;
  const ratio = muscleScore / eliteScore;
  const pct = 100 * Math.pow(Math.max(0, ratio), 0.7);
  return Math.round(Math.max(0, Math.min(100, pct)));
}

// --- SECTION 5: Future user data blending ---

/**
 * When Liftly has enough users, blend real percentiles with model percentiles.
 * For now liftlyUserPercentile can be 0 or omitted (model-only).
 */
export function blendPercentile(
  modelPercentile: number,
  liftlyUserPercentile: number | null
): number {
  if (liftlyUserPercentile == null) return modelPercentile;
  const blended =
    0.8 * modelPercentile + 0.2 * liftlyUserPercentile;
  return Math.round(Math.max(0, Math.min(100, blended)));
}

// --- SECTION 8 & 9: Rank distribution and tiers ---

/** Rank bands: 0–9 Newbie, 9–18 Starter, ... (max is exclusive for next band). */
export const RANK_BANDS: { min: number; max: number; rank: string }[] = [
  { min: 0, max: 9, rank: "Newbie" },
  { min: 9, max: 18, rank: "Starter" },
  { min: 18, max: 30, rank: "Apprentice" },
  { min: 30, max: 50, rank: "Lifter" },
  { min: 50, max: 65, rank: "Semi-Pro" },
  { min: 65, max: 75, rank: "Pro" },
  { min: 75, max: 84, rank: "Elite" },
  { min: 84, max: 90, rank: "Master" },
  { min: 90, max: 96, rank: "Grandmaster" },
  { min: 96, max: 99, rank: "Titan" },
  { min: 99, max: 101, rank: "GOAT" }, // 99–100 inclusive
];

/** Tier I, II, III within each rank. Example: Elite I 75–78, Elite II 78–81, Elite III 81–84. */
function getTier(percentile: number, min: number, max: number): "I" | "II" | "III" {
  const width = max - min;
  if (width <= 0) return "I";
  const third = width / 3;
  if (percentile < min + third) return "I";
  if (percentile < min + 2 * third) return "II";
  return "III";
}

export function percentileToRank(percentile: number): { rank: string; tier: "I" | "II" | "III"; rankLabel: string } {
  const clamped = Math.max(0, Math.min(100, percentile));
  for (const band of RANK_BANDS) {
    if (clamped >= band.min && clamped < band.max) {
      const tier = getTier(clamped, band.min, band.max);
      const rankLabel = band.rank === "GOAT" ? `${band.rank} 🐐` : `${band.rank} ${tier}`;
      return { rank: band.rank, tier, rankLabel };
    }
  }
  return { rank: "Newbie", tier: "I", rankLabel: "Newbie I" };
}

// --- SECTION 10: Final output types ---

export type MuscleRankOutput = {
  percentile: number;
  rank: string;
  rankLabel: string;
};

export type StrengthRankingOutput = {
  musclePercentiles: Record<StrengthRankMuscle, number>;
  muscleRanks: Record<StrengthRankMuscle, MuscleRankOutput>;
  overallPercentile: number;
  overallRank: string;
  overallRankLabel: string;
};

// --- Main entry: compute full ranking ---

export type StrengthRankingInput = {
  /** Best estimated 1RM (kg) per exercise id */
  best1RMByExercise: Record<string, number>;
  /** Category name per exercise id */
  categoryByExercise: Record<string, string>;
  /** User bodyweight in kg */
  bodyweightKg: number;
  /** Optional: real user percentiles per muscle when Liftly has enough data */
  liftlyUserPercentiles?: Partial<Record<StrengthRankMuscle, number>> | null;
};

/** Default output when there is no exercise or 1RM data: all Newbie I, percentile 0. Never null/undefined. */
function defaultStrengthRankingOutput(): StrengthRankingOutput {
  const musclePercentiles = {
    chest: 0,
    back: 0,
    legs: 0,
    shoulders: 0,
    arms: 0,
  } as Record<StrengthRankMuscle, number>;
  const muscleRanks = {
    chest: { percentile: 0, rank: "Newbie", rankLabel: "Newbie I" },
    back: { percentile: 0, rank: "Newbie", rankLabel: "Newbie I" },
    legs: { percentile: 0, rank: "Newbie", rankLabel: "Newbie I" },
    shoulders: { percentile: 0, rank: "Newbie", rankLabel: "Newbie I" },
    arms: { percentile: 0, rank: "Newbie", rankLabel: "Newbie I" },
  } as Record<StrengthRankMuscle, MuscleRankOutput>;
  return {
    musclePercentiles,
    muscleRanks,
    overallPercentile: 0,
    overallRank: "Newbie",
    overallRankLabel: "Newbie I",
  };
}

/**
 * Compute Liftly strength ranking from exercise 1RMs, bodyweight, and categories.
 * Returns muscle percentiles, muscle ranks (with tier), overall percentile and rank.
 * When totalExercises === 0 or total 1RM === 0, returns Newbie I / percentile 0 for all (never null/undefined).
 */
export function computeStrengthRanking(input: StrengthRankingInput): StrengthRankingOutput {
  const { best1RMByExercise, categoryByExercise, bodyweightKg, liftlyUserPercentiles } = input;

  const totalExercises = Object.keys(best1RMByExercise).length;
  const total1RM = Object.values(best1RMByExercise).reduce((s, v) => s + (v ?? 0), 0);
  if (totalExercises === 0 || total1RM === 0) {
    return defaultStrengthRankingOutput();
  }

  const bodyweight = bodyweightKg > 0 ? bodyweightKg : 1;

  // Section 1 & 2: Exercise scores → muscle scores
  const exerciseScores: { exerciseId: string; score: number; categoryName: string }[] = [];
  for (const [exerciseId, estimated1RM] of Object.entries(best1RMByExercise)) {
    const categoryName = categoryByExercise[exerciseId] ?? "";
    if (!categoryToStrengthMuscles(categoryName).length) continue;
    const score = exerciseStrengthScore(estimated1RM, bodyweight);
    exerciseScores.push({ exerciseId, score, categoryName });
  }
  const muscleScores = muscleStrengthScores(exerciseScores);

  // Section 4 & 5: Model percentile per muscle, optionally blended
  const musclePercentiles = {} as Record<StrengthRankMuscle, number>;
  const muscleRanks = {} as Record<StrengthRankMuscle, MuscleRankOutput>;
  for (const m of STRENGTH_RANK_MUSCLES) {
    const eliteScore = getEliteScore(m);
    const modelPct = modelPercentileFromScore(muscleScores[m], eliteScore);
    const finalPct = blendPercentile(modelPct, liftlyUserPercentiles?.[m] ?? null);
    musclePercentiles[m] = finalPct;
    const { rank, rankLabel } = percentileToRank(finalPct);
    muscleRanks[m] = { percentile: finalPct, rank, rankLabel };
  }

  // Section 7: Overall percentile = average of muscle percentiles
  const sum = STRENGTH_RANK_MUSCLES.reduce((s, m) => s + musclePercentiles[m], 0);
  const overallPercentile = Math.round(sum / STRENGTH_RANK_MUSCLES.length);
  const { rankLabel: overallRankLabel } = percentileToRank(overallPercentile);
  const overallRank = percentileToRank(overallPercentile).rank;

  return {
    musclePercentiles,
    muscleRanks,
    overallPercentile: Math.max(0, Math.min(100, overallPercentile)),
    overallRank,
    overallRankLabel,
  };
}
