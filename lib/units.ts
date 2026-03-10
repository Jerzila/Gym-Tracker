/**
 * Unit conversion helpers. All stored data is in metric (kg, cm).
 * Use these for display and input conversion only.
 */

const KG_TO_LB = 2.20462;
const CM_TO_IN = 1 / 2.54;

export function kgToLb(kg: number): number {
  return Math.round(kg * KG_TO_LB);
}

export function lbToKg(lb: number): number {
  return Math.round((lb / KG_TO_LB) * 10) / 10;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalIn = Math.round(cm * CM_TO_IN);
  const feet = Math.floor(totalIn / 12);
  const inches = totalIn % 12;
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  const totalIn = feet * 12 + inches;
  return Math.round(totalIn / CM_TO_IN);
}

/** Alias for compatibility: returns { ft, in } */
export function cmToFtIn(cm: number): { ft: number; in: number } {
  const { feet, inches } = cmToFeetInches(cm);
  return { ft: feet, in: inches };
}

/** Alias for feetInchesToCm */
export function ftInToCm(ft: number, in_: number): number {
  return feetInchesToCm(ft, in_);
}

/** Alias for kgToLb (plural) */
export function kgToLbs(kg: number): number {
  return kgToLb(kg);
}

/** Alias for lbToKg (plural) */
export function lbsToKg(lb: number): number {
  return lbToKg(lb);
}
