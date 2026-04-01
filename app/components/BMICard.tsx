"use client";

import { calculateBMI, getBMICategory } from "@/lib/bmi";
import { getFFMICategory } from "@/lib/ffmi";
import { BMISlider } from "@/app/components/BMISlider";
import { FFMISlider } from "@/app/components/FFMISlider";

type Props = {
  /** Latest logged weight in kg (from bodyweight_logs). */
  weightKg: number | null;
  /** Height in cm from user profile. */
  heightCm: number | null;
  /** From profile after dashboard FFMI calculation; scale hidden until set. */
  ffmi: number | null;
  gender?: "male" | "female" | "other" | "prefer_not_to_say" | null;
};

function IndexSectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <h2 className="mb-3 text-xs font-medium tracking-wider text-zinc-500">
      <span>{title}</span>{" "}
      <span className="font-normal tracking-normal text-zinc-500/60">({hint})</span>
    </h2>
  );
}

export function BMICard({ weightKg, heightCm, ffmi, gender }: Props) {
  const bmi = weightKg != null && heightCm != null ? calculateBMI(weightKg, heightCm) : null;
  const category = bmi != null ? getBMICategory(bmi) : null;
  const ffmiCategory = ffmi != null ? getFFMICategory(ffmi, gender ?? undefined) : null;

  if (bmi == null) {
    const message =
      heightCm == null || heightCm <= 0
        ? "Add your height in profile to see your BMI."
        : "Log your bodyweight to see your BMI.";
    return (
      <section className="pb-8">
        <IndexSectionTitle title="Body Mass Index" hint="body weight category" />
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-6 text-center">
          <p className="text-sm text-zinc-500">{message}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="pb-8">
        <IndexSectionTitle title="Body Mass Index" hint="body weight category" />
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-zinc-100">{bmi}</span>
            <span className="text-sm font-medium" style={{ color: category!.color }}>
              {category!.label}
            </span>
          </div>

          <BMISlider bmi={bmi} />
        </div>
      </section>

      {ffmi != null && ffmiCategory != null ? (
        <section className="pb-8">
          <IndexSectionTitle title="Fat-Free Mass Index" hint="muscle mass level" />
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums text-zinc-100">{ffmi}</span>
              <span className="text-sm font-medium" style={{ color: ffmiCategory.color }}>
                {ffmiCategory.label}
              </span>
            </div>
            <FFMISlider ffmi={ffmi} />
          </div>
        </section>
      ) : null}
    </>
  );
}
