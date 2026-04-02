import { getEffectiveWeight, normalizeLoadType, type LoadType } from "@/lib/loadType";

type StrengthRecOpts = {
  userBodyweightKg?: number;
  /** Fraction of bodyweight for effective load (bodyweight exercises). Default 1. */
  bodyweightLoadFraction?: number;
};

type WorkoutHistoryEntry = {
  weight: number;
  load_type?: LoadType;
  sets: { reps: number; weight?: number | null }[];
};

type RepRange = {
  minRep: number;
  maxRep: number;
};

export type StrengthRecommendation = {
  action: "increase" | "keep" | "no_data";
  title: "Strength Recommendation";
  subtitle: "Next workout target";
  nextWeightKg: number | null;
  currentWeightKg: number | null;
  targetRep: number | null;
  bestRep: number | null;
  primaryText: string;
  secondaryText: string;
  emptyStateText: string;
  /** When set, the card uses extra-weight copy instead of total bar load. */
  bodyweightExtraMode?: boolean;
  /** Bodyweight: reps-only target (no automatic weight progression). */
  bodyweightRepProgression?: boolean;
};

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Suggests next session targets from the most recent workout.
 * Weighted exercises use rep range + load; bodyweight uses max reps only (no auto weight bump).
 */
export function getStrengthRecommendation(
  exerciseHistory: WorkoutHistoryEntry[],
  repRange: RepRange,
  loadType: LoadType | undefined = "weight",
  _opts?: StrengthRecOpts
): StrengthRecommendation {
  const fallbackMin = Number.isFinite(repRange.minRep) && repRange.minRep > 0 ? repRange.minRep : 6;
  const fallbackMax = Number.isFinite(repRange.maxRep) && repRange.maxRep >= fallbackMin ? repRange.maxRep : 10;
  const lt = normalizeLoadType(loadType);

  const latest = exerciseHistory[0];
  if (!latest) {
    return {
      action: "no_data",
      title: "Strength Recommendation",
      subtitle: "Next workout target",
      nextWeightKg: null,
      currentWeightKg: null,
      targetRep: null,
      bestRep: null,
      primaryText: "",
      secondaryText: "",
      emptyStateText: "Log your first workout to receive strength recommendations.",
    };
  }

  if (lt === "bodyweight") {
    let bestRep = 0;
    for (const set of latest.sets) {
      const r = Number(set.reps);
      if (Number.isFinite(r) && r > bestRep) bestRep = r;
    }
    if (bestRep <= 0) {
      return {
        action: "no_data",
        title: "Strength Recommendation",
        subtitle: "Next workout target",
        nextWeightKg: null,
        currentWeightKg: null,
        targetRep: null,
        bestRep: null,
        primaryText: "",
        secondaryText: "",
        emptyStateText: "Log your first workout to receive strength recommendations.",
      };
    }

    const targetReps = bestRep + 1;
    return {
      action: "keep",
      title: "Strength Recommendation",
      subtitle: "Next workout target",
      nextWeightKg: null,
      currentWeightKg: null,
      targetRep: targetReps,
      bestRep,
      primaryText: "",
      secondaryText: `Try to beat your best set of ${bestRep} reps.`,
      emptyStateText: "",
      bodyweightRepProgression: true,
    };
  }

  const loggedWeight = Number(latest.weight);
  const factor = lt === "unilateral" ? 2 : 1;
  const fallbackW = Number.isFinite(loggedWeight) && loggedWeight > 0 ? loggedWeight : 0;
  let maxKg = 0;
  for (const set of latest.sets) {
    const kg =
      set.weight != null && Number.isFinite(Number(set.weight)) ? Number(set.weight) : fallbackW;
    if (kg > maxKg) maxKg = kg;
  }
  const effectiveWeight = getEffectiveWeight(maxKg, lt);
  let bestRep = 0;
  for (const set of latest.sets) {
    const kg =
      set.weight != null && Number.isFinite(Number(set.weight)) ? Number(set.weight) : fallbackW;
    if (kg !== maxKg) continue;
    const r = Number(set.reps);
    if (Number.isFinite(r) && r > bestRep) bestRep = r;
  }
  if (bestRep <= 0 || maxKg <= 0) {
    return {
      action: "no_data",
      title: "Strength Recommendation",
      subtitle: "Next workout target",
      nextWeightKg: null,
      currentWeightKg: null,
      targetRep: null,
      bestRep: null,
      primaryText: "",
      secondaryText: "",
      emptyStateText: "Log your first workout to receive strength recommendations.",
    };
  }

  if (bestRep >= fallbackMax) {
    return {
      action: "increase",
      title: "Strength Recommendation",
      subtitle: "Next workout target",
      nextWeightKg: roundToTenth((effectiveWeight + 2.5) / factor),
      currentWeightKg: roundToTenth(effectiveWeight / factor),
      targetRep: fallbackMin,
      bestRep,
      primaryText: `Increase weight to ${roundToTenth((effectiveWeight + 2.5) / factor)} kg`,
      secondaryText: "You reached the top rep range.",
      emptyStateText: "",
    };
  }

  return {
    action: "keep",
    title: "Strength Recommendation",
    subtitle: "Next workout target",
    nextWeightKg: roundToTenth(effectiveWeight / factor),
    currentWeightKg: roundToTenth(effectiveWeight / factor),
    targetRep: bestRep + 1,
    bestRep,
    primaryText: `Keep same weight of ${roundToTenth(effectiveWeight / factor)} kg`,
    secondaryText: `Try to beat your last best set of ${bestRep} reps.`,
    emptyStateText: "",
  };
}
