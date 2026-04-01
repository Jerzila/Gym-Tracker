/**
 * FFMI (fat-free mass index). Weight in kg, height in cm, body fat as percentage (0–100).
 */

export type FFMICategory = {
  label: string;
  color: string;
};

type FFMIGender = "male" | "female" | "other" | "prefer_not_to_say" | null | undefined;

export function calculateFFMI(
  weightKg: number,
  heightCm: number,
  bodyFatPercent: number
): number | null {
  if (
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    !Number.isFinite(heightCm) ||
    heightCm <= 0 ||
    !Number.isFinite(bodyFatPercent) ||
    bodyFatPercent < 0 ||
    bodyFatPercent > 100
  ) {
    return null;
  }
  const leanMass = weightKg * (1 - bodyFatPercent / 100);
  const heightM = heightCm / 100;
  if (heightM <= 0) return null;
  const ffmi = leanMass / (heightM * heightM);
  return Math.round(ffmi * 10) / 10;
}

/** Muscularity bands for natural-lifter-oriented interpretation. */
export function getFFMICategory(ffmi: number, gender?: FFMIGender): FFMICategory {
  if (gender === "female") {
    if (ffmi < 14) return { label: "Very low", color: "#9CA3AF" };
    if (ffmi < 16) return { label: "Average", color: "#93C5FD" };
    if (ffmi < 18) return { label: "Trained", color: "#34D399" };
    if (ffmi < 20) return { label: "Muscular", color: "#FBBF24" };
    if (ffmi < 21) return { label: "Elite natural", color: "#F59E0B" };
    return { label: "Extremely muscular", color: "#EF4444" };
  }

  // Default to the existing (male) scale for non-female genders.
  if (ffmi < 18) return { label: "Very low", color: "#9CA3AF" };
  if (ffmi < 20) return { label: "Average", color: "#93C5FD" };
  if (ffmi < 22) return { label: "Trained", color: "#34D399" };
  if (ffmi < 24) return { label: "Muscular", color: "#FBBF24" };
  if (ffmi < 25) return { label: "Elite natural", color: "#F59E0B" };
  return { label: "Extremely muscular", color: "#EF4444" };
}

/** Linear scale for FFMI bar (indicator clamps here; 25+ maps into last segment). */
export const FFMI_SLIDER_MIN = 14;
export const FFMI_SLIDER_MAX = 28;

const ffmiSpan = FFMI_SLIDER_MAX - FFMI_SLIDER_MIN;

/** Position 0–100% along the bar for the white thumb. */
export function getFFMIPosition(ffmi: number): number {
  const clamped = Math.max(FFMI_SLIDER_MIN, Math.min(ffmi, FFMI_SLIDER_MAX));
  return ((clamped - FFMI_SLIDER_MIN) / ffmiSpan) * 100;
}

/** Bar segments aligned with getFFMICategory thresholds (14–18 very low … 25–28 capped “extremely”). */
export const FFMI_BAR_SEGMENTS = [
  {
    label: "Very low",
    /** Shown under the bar (narrow columns — keep short to avoid overlap). */
    legendShort: "Very low",
    widthPercent: ((18 - FFMI_SLIDER_MIN) / ffmiSpan) * 100,
    color: "#9CA3AF",
  },
  {
    label: "Average",
    legendShort: "Average",
    widthPercent: ((20 - 18) / ffmiSpan) * 100,
    color: "#93C5FD",
  },
  {
    label: "Trained",
    legendShort: "Trained",
    widthPercent: ((22 - 20) / ffmiSpan) * 100,
    color: "#34D399",
  },
  {
    label: "Muscular",
    legendShort: "Muscular",
    widthPercent: ((24 - 22) / ffmiSpan) * 100,
    color: "#FBBF24",
  },
  {
    label: "Elite natural",
    legendShort: "Elite",
    widthPercent: ((25 - 24) / ffmiSpan) * 100,
    color: "#F59E0B",
  },
  {
    label: "Extremely muscular",
    legendShort: "Extreme",
    widthPercent: ((FFMI_SLIDER_MAX - 25) / ffmiSpan) * 100,
    color: "#EF4444",
  },
] as const;
