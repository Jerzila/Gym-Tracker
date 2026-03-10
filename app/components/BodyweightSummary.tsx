"use client";

import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";

type BodyweightStats = {
  latest: { weight: number; date: string } | null;
  diffFromPrevious: number | null;
  avg7Days: number | null;
  change30Days: number | null;
};

export function BodyweightSummary({ stats }: { stats: BodyweightStats }) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  if (stats.avg7Days == null && stats.change30Days == null) return null;
  return (
    <section className="pb-8">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Summary
      </h2>
      <div className="flex flex-wrap gap-3">
        {stats.avg7Days != null && (
          <div className="rounded-xl bg-zinc-900/40 px-4 py-3">
            <p className="text-xs text-zinc-500">7-day average</p>
            <p className="text-lg font-semibold">
              {formatWeight(stats.avg7Days, { units })} {weightLabel}
            </p>
          </div>
        )}
        {stats.change30Days != null && (
          <div className="rounded-xl bg-zinc-900/40 px-4 py-3">
            <p className="text-xs text-zinc-500">Change (30 days)</p>
            <p
              className={`text-lg font-semibold ${
                stats.change30Days >= 0 ? "text-amber-400/90" : "text-emerald-400/90"
              }`}
            >
              {formatWeight(stats.change30Days, { units, signed: true })} {weightLabel}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
