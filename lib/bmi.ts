/**
 * BMI calculation and categories.
 * Weight and height must be in kg and cm (convert imperial before calling if needed).
 */

/**
 * Calculate BMI from weight (kg) and height (cm).
 * Returns value rounded to 1 decimal, or null if inputs invalid.
 */
export function calculateBMI(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || heightCm <= 0 || weightKg <= 0) {
    return null;
  }
  const heightMeters = heightCm / 100;
  const bmi = weightKg / (heightMeters * heightMeters);
  return Math.round(bmi * 10) / 10;
}

export type BMICategory = {
  label: string;
  color: string; // hex e.g. #34D399
};

/** BMI categories: Underweight < 18.5, Normal < 25, Overweight < 30, Obese 30+ */
export function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) return { label: "Underweight", color: "#9CA3AF" };
  if (bmi < 25) return { label: "Normal weight", color: "#34D399" };
  if (bmi < 30) return { label: "Overweight", color: "#F59E0B" };
  return { label: "Obese", color: "#EF4444" };
}

/** Map BMI to bar position (0–100%). Clamps BMI between 10 and 40 so the dot is never cramped at the start. */
export function getBMIPosition(bmi: number): number {
  const min = 10;
  const max = 40;
  const clamped = Math.max(min, Math.min(bmi, max));
  return ((clamped - min) / (max - min)) * 100;
}

/** Fixed segment widths for the BMI bar: Underweight 35%, Normal 25%, Overweight 20%, Obese 20% */
export const BMI_BAR_SEGMENTS = [
  { label: "Underweight", widthPercent: 35, color: "#9CA3AF" },
  { label: "Normal", widthPercent: 25, color: "#34D399" },
  { label: "Overweight", widthPercent: 20, color: "#F59E0B" },
  { label: "Obese", widthPercent: 20, color: "#EF4444" },
] as const;
