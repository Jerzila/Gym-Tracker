"use client";

import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";

type Props = {
  heaviest: number | null;
  best1RM: number | null;
  maxRepsAtHeaviest: number | null;
};

export function ExercisePRs({ heaviest, best1RM, maxRepsAtHeaviest }: Props) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  if (heaviest == null && best1RM == null) return null;
  return (
    <section className="pb-8">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
        PRs
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {heaviest != null && (
          <div className="card-tap rounded-xl bg-zinc-900/40 px-4 py-3">
            <p className="text-xs text-zinc-500">Heaviest weight</p>
            <p className="text-lg font-semibold">
              {formatWeight(heaviest, { units })} {weightLabel}
            </p>
          </div>
        )}
        {maxRepsAtHeaviest != null && heaviest != null && (
          <div className="card-tap rounded-xl bg-zinc-900/40 px-4 py-3">
            <p className="text-xs text-zinc-500">
              Best at {formatWeight(heaviest, { units })} {weightLabel}
            </p>
            <p className="text-lg font-semibold">{maxRepsAtHeaviest} reps</p>
          </div>
        )}
        {best1RM != null && (
          <div className="card-tap rounded-xl bg-zinc-900/40 px-4 py-3">
            <p className="text-xs text-zinc-500">Est. 1RM</p>
            <p className="text-lg font-semibold">
              {formatWeight(best1RM, { units })} {weightLabel}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
