import { formatWeight, type WeightUnits } from "@/lib/formatWeight";
import { normalizeLoadType } from "@/lib/loadType";

type SetRow = { reps: number; weight?: number | null };

/**
 * Human-facing summary for logged sets (does not expose full bodyweight).
 * Bodyweight exercises: "8, 10" or "+10.0 kg × 8, 8"; other load types return "" (caller uses bar-weight formatting).
 */
export function formatLoggedSetsSummary(
  sets: SetRow[] | undefined,
  loadType: unknown,
  units: WeightUnits,
  weightLabel: string
): string {
  if (normalizeLoadType(loadType) !== "bodyweight") return "";
  const list = sets ?? [];
  if (list.length === 0) return "";
  const extras = list.map((s) =>
    s.weight != null && Number.isFinite(Number(s.weight)) ? Math.max(0, Number(s.weight)) : 0
  );
  const repParts = list.map((s) => String(Math.max(0, Number(s.reps) || 0)));
  if (extras.every((e) => e === 0)) {
    return repParts.join(", ");
  }
  const distinct = new Set(extras.map((e) => Math.round(e * 10) / 10));
  if (distinct.size === 1) {
    const e = extras[0]!;
    const signed = formatWeight(e, { units, signed: true });
    return `${signed} ${weightLabel} × ${repParts.join(", ")}`;
  }
  return list
    .map((s, i) => {
      const r = Math.max(0, Number(s.reps) || 0);
      const ex = extras[i] ?? 0;
      if (ex <= 0) return `${r} reps`;
      const signed = formatWeight(ex, { units, signed: true });
      return `${signed} ${weightLabel} × ${r}`;
    })
    .join(" • ");
}
