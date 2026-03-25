"use client";

import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import type { StrengthRecommendation } from "@/lib/strengthRecommendation";
import { useUnits } from "@/app/components/UnitsContext";

type Props = {
  recommendation: StrengthRecommendation;
};

export function StrengthRecommendationCard({ recommendation }: Props) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  const targetWeightLabel =
    recommendation.nextWeightKg != null
      ? `${formatWeight(recommendation.nextWeightKg, { units })} ${weightLabel}`
      : "";
  const primaryText =
    recommendation.action === "no_data" || recommendation.currentWeightKg == null
      ? recommendation.primaryText
      : recommendation.primaryText.replace(
          `${recommendation.currentWeightKg} kg`,
          `${formatWeight(recommendation.currentWeightKg, { units })} ${weightLabel}`
        );
  const increaseText =
    recommendation.action === "increase" && recommendation.nextWeightKg != null
      ? recommendation.primaryText.replace(
          `${recommendation.nextWeightKg} kg`,
          `${formatWeight(recommendation.nextWeightKg, { units })} ${weightLabel}`
        )
      : primaryText;

  return (
    <section className="pb-8">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
        {recommendation.title}
      </h2>

      <div className="rounded-xl border-l-4 border-amber-500 bg-zinc-900/40 px-3 py-2.5">
        {recommendation.action === "no_data" ? (
          <p className="text-sm text-zinc-300">{recommendation.emptyStateText}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-zinc-200">{recommendation.subtitle}</p>
            <p className="mt-1 text-base font-semibold text-zinc-100">
              {targetWeightLabel} × {recommendation.targetRep} reps
            </p>
            <p className="mt-1.5 text-sm text-zinc-200">
              {recommendation.action === "increase" ? increaseText : primaryText}
            </p>
            <p className="text-sm text-zinc-400">{recommendation.secondaryText}</p>
          </>
        )}
      </div>
    </section>
  );
}
