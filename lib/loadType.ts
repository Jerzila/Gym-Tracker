export type LoadType = "bilateral" | "unilateral";

export function normalizeLoadType(value: unknown): LoadType {
  return value === "unilateral" ? "unilateral" : "bilateral";
}

export function getEffectiveWeight(weight: number, loadType: unknown): number {
  const numericWeight = Number(weight);
  const safeWeight = Number.isFinite(numericWeight) ? numericWeight : 0;
  return normalizeLoadType(loadType) === "unilateral" ? safeWeight * 2 : safeWeight;
}
