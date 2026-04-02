"use client";

import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";
import type { StrengthProgressResult } from "@/lib/pr";

type Props = {
  heaviest: number | null;
  best1RM: number | null;
  maxRepsAtHeaviest: number | null;
  strengthProgress: StrengthProgressResult | null;
};

function formatSignedPercent(n: number): string {
  if (n === 0) return "0%";
  return `${n > 0 ? "+" : ""}${n}%`;
}

export function ExercisePRs({
  heaviest,
  best1RM,
  maxRepsAtHeaviest,
  strengthProgress,
}: Props) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  if (heaviest == null && best1RM == null && strengthProgress == null) {
    return null;
  }
  const strengthColorClass =
    strengthProgress == null
      ? ""
      : strengthProgress.kgChange > 0
        ? "text-emerald-400"
        : strengthProgress.kgChange < 0
          ? "text-red-400"
          : "text-zinc-400";
  const strengthProgressDisplay =
    strengthProgress == null ? (
      "—"
    ) : strengthProgress.kgChange === 0 ? (
      <>
        0 {weightLabel} / {formatSignedPercent(strengthProgress.percentChange)}
      </>
    ) : (
      <>
        {strengthProgress.kgChange > 0 ? "+" : "-"}
        {formatWeight(Math.abs(strengthProgress.kgChange), { units })}{" "}
        {weightLabel} / {formatSignedPercent(strengthProgress.percentChange)}
      </>
    );
  return (
    <section className="pb-8">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
        PRs
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="card-tap rounded-xl bg-zinc-900/40 px-4 py-3">
          <p className="text-xs text-zinc-500">Heaviest Weight</p>
          <p className="text-lg font-semibold">
            {heaviest != null ? (
              <>
                {formatWeight(heaviest, { units })} {weightLabel}
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
        <div className="card-tap rounded-xl bg-zinc-900/40 px-4 py-3">
          <p className="text-xs text-zinc-500">
            {heaviest != null ? (
              <>
                Best at {formatWeight(heaviest, { units })} {weightLabel}
              </>
            ) : (
              "Best at weight"
            )}
          </p>
          <p className="text-lg font-semibold">
            {maxRepsAtHeaviest != null && heaviest != null
              ? `${maxRepsAtHeaviest} reps`
              : "—"}
          </p>
        </div>
        <div className="card-tap rounded-xl bg-zinc-900/40 px-4 py-3">
          <p className="text-xs text-zinc-500">Est. 1RM</p>
          <p className="text-lg font-semibold">
            {best1RM != null ? (
              <>
                {formatWeight(best1RM, { units })} {weightLabel}
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
        <div className="card-tap min-w-0 rounded-xl bg-zinc-900/40 px-4 py-3">
          <p className="text-xs text-zinc-500">Strength Progress</p>
          <p
            className={[
              "text-base font-semibold tabular-nums leading-snug tracking-tight whitespace-nowrap sm:text-lg",
              strengthColorClass,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {strengthProgressDisplay}
          </p>
        </div>
      </div>
    </section>
  );
}
