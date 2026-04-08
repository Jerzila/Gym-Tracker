import { bodyweightLoadFractionFromCategoryName } from "@/lib/bodyweightCategoryFraction";
import { epley1RM } from "@/lib/progression";
import { getEffectiveWeight, normalizeLoadType, type LoadType } from "@/lib/loadType";

/** One logged set; `weight` null/omitted means “use workout row weight” (simple logging / legacy). */
export type SessionSetRow = { reps: number; weight?: number | null };

/** For bodyweight exercises: per-set `weight` is extra load only (kg). */
export type SessionStrengthContext = {
  userBodyweightKg?: number;
  /** Fraction of bodyweight counted as load (from exercise category). Defaults to 1 if omitted. */
  bodyweightLoadFraction?: number;
};

export function bodyweightStrengthSessionContext(
  userBodyweightKg: number,
  categoryName: string | null | undefined
): SessionStrengthContext {
  return {
    userBodyweightKg,
    bodyweightLoadFraction: bodyweightLoadFractionFromCategoryName(categoryName ?? ""),
  };
}

function extraWeightKgFromSet(s: SessionSetRow): number {
  if (s.weight != null && Number.isFinite(Number(s.weight))) {
    return Math.max(0, Number(s.weight));
  }
  return 0;
}

/**
 * Resolved load in kg for strength/volume: bar weight or effective bodyweight+extra.
 */
export function resolvedSetWeightKg(
  s: SessionSetRow,
  workoutFallbackKg: number,
  loadType?: unknown,
  ctx?: SessionStrengthContext
): number {
  const t = normalizeLoadType(loadType);
  if (t === "bodyweight") {
    const frac = ctx?.bodyweightLoadFraction ?? 1;
    const bwPart = (ctx?.userBodyweightKg ?? 0) * frac;
    return bwPart + extraWeightKgFromSet(s);
  }
  const fromSet = s.weight != null ? Number(s.weight) : NaN;
  if (Number.isFinite(fromSet) && fromSet > 0) return fromSet;
  const fb = Number(workoutFallbackKg);
  return Number.isFinite(fb) && fb > 0 ? fb : 0;
}

/**
 * Strength metrics for a session: take the set(s) at the maximum logged load (kg).
 * Estimated 1RM uses that load with reps from those sets only (tie: best Epley among them).
 * Does not mix reps from lighter sets with the heaviest load.
 */
export function sessionBestStrengthSetFromSets(
  sets: SessionSetRow[],
  workoutFallbackKg: number,
  loadType: LoadType | unknown,
  ctx?: SessionStrengthContext
): { weightKg: number; reps: number; estimated1RM: number } | null {
  if (normalizeLoadType(loadType) === "timed") return null;
  if (!sets.length) return null;
  let maxKg = 0;
  for (const s of sets) {
    const kg = resolvedSetWeightKg(s, workoutFallbackKg, loadType, ctx);
    if (kg > maxKg) maxKg = kg;
  }
  if (maxKg <= 0) return null;
  const effectiveAtMax = getEffectiveWeight(maxKg, loadType);
  let best: { weightKg: number; reps: number; estimated1RM: number } | null = null;
  for (const s of sets) {
    const kg = resolvedSetWeightKg(s, workoutFallbackKg, loadType, ctx);
    if (kg !== maxKg) continue;
    const reps = Number(s.reps) || 0;
    const rm = epley1RM(effectiveAtMax, reps);
    if (!best || rm > best.estimated1RM) {
      best = { weightKg: maxKg, reps, estimated1RM: rm };
    }
  }
  return best;
}

/**
 * Heaviest resolved load (kg) logged in the session — max bar/extra+bw load, not Epley estimate.
 * Falls back to bodyweight + extra or workout row weight when there are no sets.
 */
export function sessionMaxResolvedLoadKg(
  sets: SessionSetRow[],
  workoutFallbackKg: number,
  loadType: LoadType | unknown,
  ctx?: SessionStrengthContext
): number {
  const t = normalizeLoadType(loadType);
  if (t === "timed") return 0;
  const best = sessionBestStrengthSetFromSets(sets, workoutFallbackKg, loadType, ctx);
  if (best != null && best.weightKg > 0) return best.weightKg;
  if (t === "bodyweight" && ctx?.userBodyweightKg != null) {
    const frac = ctx.bodyweightLoadFraction ?? 1;
    return ctx.userBodyweightKg * frac + Math.max(0, Number(workoutFallbackKg) || 0);
  }
  return Math.max(0, Number(workoutFallbackKg) || 0);
}

export function sessionEstimated1RMFromSets(
  sets: SessionSetRow[],
  workoutFallbackKg: number,
  loadType: LoadType | unknown,
  ctx?: SessionStrengthContext
): number {
  return sessionBestStrengthSetFromSets(sets, workoutFallbackKg, loadType, ctx)?.estimated1RM ?? 0;
}

/** Session volume (kg load × reps), effective load per set (unilateral doubles, bodyweight uses bw+extra). */
export function sessionVolumeKgFromSets(
  sets: SessionSetRow[],
  workoutFallbackKg: number,
  loadType: LoadType | unknown,
  ctx?: SessionStrengthContext
): number {
  if (normalizeLoadType(loadType) === "timed") return 0;
  let vol = 0;
  for (const s of sets) {
    const kg = resolvedSetWeightKg(s, workoutFallbackKg, loadType, ctx);
    if (kg <= 0) continue;
    const eff = getEffectiveWeight(kg, loadType);
    vol += eff * Math.max(0, Number(s.reps) || 0);
  }
  return vol;
}
