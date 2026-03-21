"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { updateProfileField } from "@/app/actions/profile";
import { InstallAppButton } from "@/app/components/InstallAppButton";
import { buttonClass } from "@/app/components/Button";
import type { Profile } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";
const labelClass = "block text-sm font-medium text-zinc-400 mb-1";

export function SettingsPreferencesForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setUnits((profile.units ?? "metric") as "metric" | "imperial");
  }, [profile?.id, profile?.units, profile?.updated_at]);

  const savedUnits = (profile?.units ?? "metric") as "metric" | "imperial";
  const dirty = profile != null && units !== savedUnits;

  const save = useCallback(() => {
    if (!profile || !dirty) return;
    setError(null);
    startTransition(async () => {
      const res = await updateProfileField("units", units);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }, [dirty, profile, router, units]);

  if (!profile) {
    return <p className="text-sm text-zinc-400">Loading profile…</p>;
  }

  return (
    <div className="flex min-h-[60vh] flex-col px-1 pb-8 pt-2">
      <div className="flex-1 space-y-6">
        {error && (
          <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <div>
          <label htmlFor="settings-units" className={labelClass}>
            Units
          </label>
          <select
            id="settings-units"
            className={inputClass}
            value={units}
            onChange={(e) => setUnits(e.target.value as "metric" | "imperial")}
          >
            <option value="metric">Metric (kg / cm)</option>
            <option value="imperial">Imperial (lb / ft)</option>
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Height and weight will display in your chosen units.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">App</p>
          <InstallAppButton variant="in-app" />
        </div>
      </div>

      <div className="mt-auto border-t border-zinc-800 pt-6">
        <button
          type="button"
          className={`${buttonClass.primary} w-full`}
          disabled={!dirty || pending}
          onClick={save}
        >
          {pending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
