"use client";

import { useRouter } from "next/navigation";
import { updateProfileField } from "@/app/actions/profile";
import type { Profile } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";
const labelClass = "block text-sm font-medium text-zinc-400 mb-1";

export function UnitsSetting({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const units = profile?.units ?? "metric";

  async function handleChange(value: "metric" | "imperial") {
    const res = await updateProfileField("units", value);
    if (!res.error) router.refresh();
  }

  if (!profile) return null;

  return (
    <div>
      <label htmlFor="account-units" className={labelClass}>
        Units
      </label>
      <select
        id="account-units"
        className={inputClass}
        value={units}
        onChange={(e) => handleChange(e.target.value as "metric" | "imperial")}
      >
        <option value="metric">Metric (kg / cm)</option>
        <option value="imperial">Imperial (lb / ft)</option>
      </select>
      <p className="mt-1 text-xs text-zinc-500">
        Height and weight will display in your chosen units.
      </p>
    </div>
  );
}
