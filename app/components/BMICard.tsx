"use client";

import { calculateBMI, getBMICategory, getBMIPosition, BMI_BAR_SEGMENTS } from "@/lib/bmi";

type Props = {
  /** Latest logged weight in kg (from bodyweight_logs). */
  weightKg: number | null;
  /** Height in cm from user profile. */
  heightCm: number | null;
};

export function BMICard({ weightKg, heightCm }: Props) {
  const bmi = weightKg != null && heightCm != null ? calculateBMI(weightKg, heightCm) : null;
  const category = bmi != null ? getBMICategory(bmi) : null;

  if (bmi == null) {
    const message =
      heightCm == null || heightCm <= 0
        ? "Add your height in profile to see your BMI."
        : "Log your bodyweight to see your BMI.";
    return (
      <section className="pb-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Body Mass Index
        </h2>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-6 text-center">
          <p className="text-sm text-zinc-500">{message}</p>
        </div>
      </section>
    );
  }

  const position = getBMIPosition(bmi);

  return (
    <section className="pb-8">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Body Mass Index
      </h2>
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-zinc-100">{bmi}</span>
          <span className="text-sm font-medium" style={{ color: category!.color }}>
            {category!.label}
          </span>
        </div>

        {/* Scale markers (BMI thresholds) */}
        <div className="mb-1 flex justify-between text-xs text-zinc-500">
          <span>18.5</span>
          <span>25</span>
          <span>30</span>
        </div>

        {/* Segmented bar with fixed proportions */}
        <div className="relative flex h-3 w-full overflow-hidden rounded-full">
          {BMI_BAR_SEGMENTS.map((seg) => (
            <div
              key={seg.label}
              className="h-full flex-shrink-0"
              style={{ width: `${seg.widthPercent}%`, backgroundColor: seg.color }}
              title={seg.label}
            />
          ))}
          <div
            className="absolute -top-1 h-4 w-4 rounded-full border-2 border-zinc-900 bg-white shadow"
            style={{ left: `${position}%`, transform: "translateX(-50%)" }}
            title={`Your BMI: ${bmi}`}
          />
        </div>

        <div className="mt-1.5 flex justify-between text-[10px] text-zinc-500">
          <span>Underweight</span>
          <span>Normal</span>
          <span>Overweight</span>
          <span>Obese</span>
        </div>
      </div>
    </section>
  );
}
