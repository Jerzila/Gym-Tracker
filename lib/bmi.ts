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

/** Slider / bar map BMI linearly from min to max (WHO-style category boundaries on the bar). */
export const BMI_SLIDER_MIN = 15;
export const BMI_SLIDER_MAX = 35;

/** Standard adult BMI categories: under 18.5, 18.5–25, 25–30, 30+. */
export function getBMICategory(bmi: number): BMICategory {
  let label: string;
  let color: string;
  if (bmi < 18.5) {
    label = "Underweight";
    color = "#9CA3AF";
  } else if (bmi < 25) {
    label = "Normal weight";
    color = "#34D399";
  } else if (bmi < 30) {
    label = "Overweight";
    color = "#F59E0B";
  } else {
    label = "Obese";
    color = "#EF4444";
  }
  return { label, color };
}

/**
 * Indicator position 0–100% along the bar from the continuous BMI value only
 * (not category thresholds). Clamped to BMI_SLIDER_MIN–MAX.
 */
export function getBMIPosition(bmi: number): number {
  const clampedBMI = Math.max(BMI_SLIDER_MIN, Math.min(bmi, BMI_SLIDER_MAX));
  return ((clampedBMI - BMI_SLIDER_MIN) / (BMI_SLIDER_MAX - BMI_SLIDER_MIN)) * 100;
}

const span = BMI_SLIDER_MAX - BMI_SLIDER_MIN;

/** Bar segments: 15–18.5 under, 18.5–25 normal, 25–30 overweight, 30–35 obese (linear on slider range). */
export const BMI_BAR_SEGMENTS = [
  {
    label: "Underweight",
    widthPercent: ((18.5 - BMI_SLIDER_MIN) / span) * 100,
    color: "#9CA3AF",
  },
  {
    label: "Normal weight",
    widthPercent: ((25 - 18.5) / span) * 100,
    color: "#34D399",
  },
  {
    label: "Overweight",
    widthPercent: ((30 - 25) / span) * 100,
    color: "#F59E0B",
  },
  {
    label: "Obese",
    widthPercent: ((BMI_SLIDER_MAX - 30) / span) * 100,
    color: "#EF4444",
  },
] as const;
