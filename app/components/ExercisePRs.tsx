"use client";

import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";
import type { StrengthProgressResult } from "@/lib/pr";
import { formatDurationClock } from "@/lib/formatDuration";
import { formatStrengthVelocityLine } from "@/lib/strengthVelocity";

type BodyweightProps = {
  variant: "bodyweight";
  bestReps: number | null;
  strengthProgress: Extract<StrengthProgressResult, { kind: "reps" }> | null;
};

export type WeightStrengthVelocity =
  | { kind: "ok"; kgPerMonth: number }
  | { kind: "prompt_more_workouts" }
  | { kind: "needs_day_gap" };

type WeightProps = {
  variant?: "weight";
  heaviest: number | null;
  strengthVelocity: WeightStrengthVelocity;
  maxRepsAtHeaviest: number | null;
  strengthProgress: Extract<StrengthProgressResult, { kind: "weight" }> | null;
};

type TimedProps = {
  variant: "timed";
  bestTimeSec: number | null;
  strengthProgress: Extract<StrengthProgressResult, { kind: "reps" }> | null;
};

type Props = BodyweightProps | WeightProps | TimedProps;

function formatSignedPercent(n: number): string {
  if (n === 0) return "0%";
  return `${n > 0 ? "+" : ""}${n}%`;
}

export function ExercisePRs(props: Props) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);

  if (props.variant === "timed") {
    const { bestTimeSec, strengthProgress } = props;
    if (bestTimeSec == null && strengthProgress == null) return null;
    const strengthColorClass =
      strengthProgress == null
        ? ""
        : strengthProgress.repChange > 0
          ? "text-emerald-400"
          : strengthProgress.repChange < 0
            ? "text-red-400"
            : "text-zinc-400";
    const strengthProgressDisplay =
      strengthProgress == null ? (
        "—"
      ) : strengthProgress.repChange === 0 ? (
        <>
          0 sec / {formatSignedPercent(strengthProgress.percentChange)}
        </>
      ) : (
        <>
          {strengthProgress.repChange > 0 ? "+" : ""}
          {strengthProgress.repChange} sec / {formatSignedPercent(strengthProgress.percentChange)}
        </>
      );
    return (
      <section className="pb-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">PRs</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="card-tap rounded-xl bg-zinc-900/40 px-4 py-3">
            <p className="text-xs text-zinc-500">Best Time</p>
            <p className="text-lg font-semibold tabular-nums">
              {bestTimeSec != null ? formatDurationClock(bestTimeSec) : "—"}
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

  if (props.variant === "bodyweight") {
    const { bestReps, strengthProgress } = props;
    if (bestReps == null && strengthProgress == null) return null;
    const strengthColorClass =
      strengthProgress == null
        ? ""
        : strengthProgress.repChange > 0
          ? "text-emerald-400"
          : strengthProgress.repChange < 0
            ? "text-red-400"
            : "text-zinc-400";
    const strengthProgressDisplay =
      strengthProgress == null ? (
        "—"
      ) : strengthProgress.repChange === 0 ? (
        <>
          0 reps / {formatSignedPercent(strengthProgress.percentChange)}
        </>
      ) : (
        <>
          {strengthProgress.repChange > 0 ? "+" : ""}
          {strengthProgress.repChange} {Math.abs(strengthProgress.repChange) === 1 ? "rep" : "reps"} /{" "}
          {formatSignedPercent(strengthProgress.percentChange)}
        </>
      );
    return (
      <section className="pb-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">PRs</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="card-tap rounded-xl bg-zinc-900/40 px-4 py-3">
            <p className="text-xs text-zinc-500">Best Reps</p>
            <p className="text-lg font-semibold">
              {bestReps != null ? `${bestReps} ${bestReps === 1 ? "rep" : "reps"}` : "—"}
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

  const { heaviest, strengthVelocity, maxRepsAtHeaviest, strengthProgress } = props;
  if (
    heaviest == null &&
    maxRepsAtHeaviest == null &&
    strengthProgress == null &&
    (strengthVelocity.kind === "prompt_more_workouts" ||
      strengthVelocity.kind === "needs_day_gap")
  ) {
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
        {formatWeight(Math.abs(strengthProgress.kgChange), { units })} {weightLabel} /{" "}
        {formatSignedPercent(strengthProgress.percentChange)}
      </>
    );
  return (
    <section className="pb-8">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">PRs</h2>
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
        <div className="card-tap min-w-0 rounded-xl bg-zinc-900/40 px-4 py-3">
          <p className="text-xs text-zinc-500">Strength Velocity</p>
          <p
            className={[
              "text-base font-semibold tabular-nums leading-snug tracking-tight sm:text-lg break-words",
              strengthVelocity.kind === "ok"
                ? strengthVelocity.kgPerMonth > 0
                  ? "text-emerald-400"
                  : strengthVelocity.kgPerMonth < 0
                    ? "text-red-400"
                    : "text-zinc-300"
                : "text-zinc-500",
            ].join(" ")}
          >
            {strengthVelocity.kind === "ok" ? (
              formatStrengthVelocityLine(strengthVelocity.kgPerMonth, units)
            ) : strengthVelocity.kind === "prompt_more_workouts" ? (
              "Log one more workout to calculate"
            ) : (
              "Log a workout on another day"
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
