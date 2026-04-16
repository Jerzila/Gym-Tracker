import type { RankSlug } from "@/lib/rankBadges";
import type { ExerciseDataPoint, StrengthRankingOutput, StrengthRankMuscle } from "@/lib/strengthRanking";
import { STRENGTH_RANK_MUSCLES } from "@/lib/strengthRanking";
import { muscleRankStrengthOrdinal } from "@/lib/muscleRankTierOrdinal";

const MUSCLE_DISPLAY: Record<StrengthRankMuscle, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  traps: "Traps",
  core: "Core",
};

function stableAffectedOrder(muscles: StrengthRankMuscle[]): StrengthRankMuscle[] {
  const set = new Set(muscles);
  return STRENGTH_RANK_MUSCLES.filter((m) => set.has(m));
}

function formatPercentileSubtext(topPercentileLabel: string): string | null {
  const m = String(topPercentileLabel ?? "").trim().match(/Top\s*([\d.]+)\s*%/i);
  if (!m) return null;
  const n = Math.round(parseFloat(m[1]));
  if (!Number.isFinite(n)) return null;
  return `Top ${n}% of lifters`;
}

function maxEstimated1RmByExerciseForMuscle(
  points: ExerciseDataPoint[],
  muscle: StrengthRankMuscle
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of points) {
    if (p.forMuscle !== muscle) continue;
    if (p.isDurationSeconds) continue;
    const v = Number(p.estimated1RM);
    if (!Number.isFinite(v) || v <= 0) continue;
    const prev = map.get(p.exerciseId) ?? 0;
    if (v > prev) map.set(p.exerciseId, v);
  }
  return map;
}

/** Sum of positive per-exercise increases in best estimated 1RM (kg) for this muscle. */
function totalKgIncreaseForMuscle(
  beforePts: ExerciseDataPoint[],
  afterPts: ExerciseDataPoint[],
  muscle: StrengthRankMuscle
): number {
  const b = maxEstimated1RmByExerciseForMuscle(beforePts, muscle);
  const a = maxEstimated1RmByExerciseForMuscle(afterPts, muscle);
  let sum = 0;
  const ids = new Set<string>([...b.keys(), ...a.keys()]);
  for (const id of ids) {
    const after = a.get(id) ?? 0;
    const before = b.get(id) ?? 0;
    if (after > before) sum += after - before;
  }
  return Math.round(sum * 10) / 10;
}

export type MuscleRankUpClientPayload = {
  muscle: StrengthRankMuscle;
  muscleDisplayName: string;
  previousRankLabel: string;
  newRankLabel: string;
  /** Badge image `/{slug}.png` for the new tier (same as muscle rank cards). */
  newRankSlug: RankSlug;
  percentileSubtext: string | null;
  /** Raw values; UI formats lines (kg/lb, copy). */
  percentStrengthIncrease: number | null;
  totalStrengthIncreaseKg: number | null;
  workoutsLast30Days: number | null;
  progressLabel: string | null;
  progressPct: number | null;
  dedupeKey: string;
};

export function buildMuscleRankUpClientPayload(args: {
  affectedMuscles: StrengthRankMuscle[];
  beforeOutput: StrengthRankingOutput;
  beforePoints: ExerciseDataPoint[];
  afterOutput: StrengthRankingOutput;
  afterPoints: ExerciseDataPoint[];
  workoutsLast30Days: number;
  workoutId: string;
}): MuscleRankUpClientPayload | null {
  const ordered = stableAffectedOrder(args.affectedMuscles);
  type Cand = { muscle: StrengthRankMuscle; jump: number; listIndex: number };
  const cands: Cand[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const muscle = ordered[i]!;
    const prev = args.beforeOutput.muscleRanks[muscle];
    const next = args.afterOutput.muscleRanks[muscle];
    const po = muscleRankStrengthOrdinal(muscle, prev.rank, prev.tier);
    const no = muscleRankStrengthOrdinal(muscle, next.rank, next.tier);
    if (po < 0 || no < 0) continue;
    const jump = no - po;
    if (jump <= 0) continue;
    cands.push({ muscle, jump, listIndex: i });
  }
  if (cands.length === 0) return null;

  cands.sort((a, b) => {
    if (b.jump !== a.jump) return b.jump - a.jump;
    return a.listIndex - b.listIndex;
  });
  const winner = cands[0]!.muscle;
  const prevRank = args.beforeOutput.muscleRanks[winner];
  const nextRank = args.afterOutput.muscleRanks[winner];

  const muscleDisplayName = MUSCLE_DISPLAY[winner];
  const percentileSubtext = formatPercentileSubtext(nextRank.topPercentileLabel);

  const beforeScore = args.beforeOutput.muscleScores[winner];
  const afterScore = args.afterOutput.muscleScores[winner];
  let percentStrengthIncrease: number | null = null;
  if (Number.isFinite(beforeScore) && beforeScore > 0 && Number.isFinite(afterScore) && afterScore > beforeScore) {
    const pct = Math.round(((afterScore - beforeScore) / beforeScore) * 100);
    if (pct > 0) percentStrengthIncrease = pct;
  }

  const totalStrengthIncreaseKg =
    args.beforePoints.length === 0
      ? null
      : (() => {
          const kgInc = totalKgIncreaseForMuscle(args.beforePoints, args.afterPoints, winner);
          return kgInc > 0 ? kgInc : null;
        })();

  const w = args.workoutsLast30Days;
  const workoutsLast30Days = Number.isFinite(w) && w > 0 ? Math.round(w) : null;

  const progressLabel =
    nextRank.nextRankLabel != null && String(nextRank.nextRankLabel).trim() !== ""
      ? `Progress to ${nextRank.nextRankLabel}`
      : null;
  const progressPct =
    progressLabel != null && Number.isFinite(nextRank.progressToNextPct)
      ? Math.min(100, Math.max(0, Math.round(nextRank.progressToNextPct)))
      : null;

  return {
    muscle: winner,
    muscleDisplayName,
    previousRankLabel: prevRank.rankLabel,
    newRankLabel: nextRank.rankLabel,
    newRankSlug: nextRank.rankSlug,
    percentileSubtext,
    percentStrengthIncrease,
    totalStrengthIncreaseKg,
    workoutsLast30Days,
    progressLabel,
    progressPct,
    dedupeKey: `${args.workoutId}:${winner}`,
  };
}
