import { getEffectiveWeight } from "@/lib/loadType";

type WorkoutHistoryEntry = {
  weight: number;
  load_type?: "bilateral" | "unilateral";
  sets: { reps: number }[];
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
};

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Uses latest workout set reps and rep range to suggest next session load.
 */
export function getStrengthRecommendation(
  exerciseHistory: WorkoutHistoryEntry[],
  repRange: RepRange,
  loadType: WorkoutHistoryEntry["load_type"] | undefined = "bilateral"
): StrengthRecommendation {
  const fallbackMin = Number.isFinite(repRange.minRep) && repRange.minRep > 0 ? repRange.minRep : 6;
  const fallbackMax = Number.isFinite(repRange.maxRep) && repRange.maxRep >= fallbackMin ? repRange.maxRep : 10;

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

  const loggedWeight = Number(latest.weight);
  const factor = loadType === "unilateral" ? 2 : 1;
  const effectiveWeight = getEffectiveWeight(loggedWeight, loadType);
  const reps = latest.sets.map((set) => Number(set.reps)).filter((rep) => Number.isFinite(rep) && rep > 0);
  if (reps.length === 0 || !Number.isFinite(loggedWeight) || loggedWeight <= 0) {
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

  const bestRep = Math.max(...reps);

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
