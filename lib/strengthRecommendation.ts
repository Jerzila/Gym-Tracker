type WorkoutHistoryEntry = {
  weight: number;
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
  repRange: RepRange
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

  const weight = Number(latest.weight);
  const reps = latest.sets.map((set) => Number(set.reps)).filter((rep) => Number.isFinite(rep) && rep > 0);
  if (reps.length === 0 || !Number.isFinite(weight) || weight <= 0) {
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
      nextWeightKg: roundToTenth(weight + 2.5),
      currentWeightKg: roundToTenth(weight),
      targetRep: fallbackMin,
      bestRep,
      primaryText: `Increase weight to ${roundToTenth(weight + 2.5)} kg`,
      secondaryText: "You reached the top rep range.",
      emptyStateText: "",
    };
  }

  return {
    action: "keep",
    title: "Strength Recommendation",
    subtitle: "Next workout target",
    nextWeightKg: roundToTenth(weight),
    currentWeightKg: roundToTenth(weight),
    targetRep: bestRep + 1,
    bestRep,
    primaryText: `Keep same weight of ${roundToTenth(weight)} kg`,
    secondaryText: `Try to beat your last best set of ${bestRep} reps.`,
    emptyStateText: "",
  };
}
