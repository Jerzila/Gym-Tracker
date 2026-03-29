/** Fixed radar axes for Muscle Balance (matches MuscleRadarChart). */
export const MUSCLE_BALANCE_RADAR_ORDER = [
  "Back",
  "Biceps",
  "Chest",
  "Legs",
  "Shoulders",
  "Triceps",
] as const;

export type MuscleBalanceRadarCategoryName = (typeof MUSCLE_BALANCE_RADAR_ORDER)[number];
