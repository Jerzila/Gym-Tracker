export const KG_TO_LB = 2.20462;

export type WeightUnits = "metric" | "imperial";

/**
 * Format a weight value (stored in kg) for display.
 * - metric: 1 decimal place, value in kg
 * - imperial: convert to lb, 1 decimal place
 * Use for absolute weights (e.g. "72.5 kg" / "160 lb") or for change values (with signed option).
 * - omitFractionIfWhole: show integers without a trailing ".0" (e.g. +15 kg instead of +15.0 kg).
 */
export function formatWeight(
  valueKg: number,
  options?: { units?: WeightUnits; signed?: boolean; omitFractionIfWhole?: boolean }
): string {
  const units = options?.units ?? "metric";
  const displayValue =
    units === "imperial" ? valueKg * KG_TO_LB : valueKg;
  const rounded = Math.round(displayValue * 10) / 10;
  const str =
    options?.omitFractionIfWhole && Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1);
  if (options?.signed && rounded > 0) {
    return `+${str}`;
  }
  return str;
}

/** Unit label for weight: "kg" or "lb" */
export function weightUnitLabel(units: WeightUnits): string {
  return units === "imperial" ? "lb" : "kg";
}
