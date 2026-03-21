"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { updateProfileField } from "@/app/actions/profile";
import { buttonClass } from "@/app/components/Button";
import { kgToLb, lbToKg, cmToFeetInches, feetInchesToCm } from "@/lib/units";
import type { Profile } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";
const labelClass = "block text-sm font-medium text-zinc-400 mb-1";

function numClose(a: number | null, b: number | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) < 0.06;
}

export function SettingsBodyMetricsForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const units = profile?.units ?? "metric";

  const [weightInput, setWeightInput] = useState("");
  const [heightCmInput, setHeightCmInput] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");

  useEffect(() => {
    if (!profile) return;
    const u = profile.units ?? "metric";
    if (u === "metric") {
      setWeightInput(profile.body_weight != null ? String(profile.body_weight) : "");
      setHeightCmInput(profile.height != null ? String(profile.height) : "");
      setHeightFt("");
      setHeightIn("");
    } else {
      setWeightInput(
        profile.body_weight != null ? String(kgToLb(profile.body_weight)) : ""
      );
      if (profile.height != null && profile.height > 0) {
        const { feet, inches } = cmToFeetInches(profile.height);
        setHeightFt(String(feet));
        setHeightIn(String(inches));
      } else {
        setHeightFt("");
        setHeightIn("");
      }
      setHeightCmInput("");
    }
  }, [profile?.id, profile?.body_weight, profile?.height, profile?.units, profile?.updated_at]);

  const parsedFromForm = useMemo(() => {
    if (!profile) return { weightKg: null as number | null, heightCm: null as number | null };
    const u = profile.units ?? "metric";
    const wTrim = weightInput.trim();
    let weightKg: number | null = null;
    if (wTrim !== "") {
      const n = Number(wTrim);
      if (Number.isFinite(n)) {
        weightKg = u === "metric" ? n : lbToKg(n);
      }
    }
    let heightCm: number | null = null;
    if (u === "metric") {
      const hTrim = heightCmInput.trim();
      if (hTrim !== "") {
        const n = Number(hTrim);
        if (Number.isFinite(n)) heightCm = n;
      }
    } else {
      const ft = Number(heightFt) || 0;
      const inch = Number(heightIn) || 0;
      if (heightFt.trim() !== "" || heightIn.trim() !== "") {
        heightCm = feetInchesToCm(ft, inch);
      }
    }
    return { weightKg, heightCm };
  }, [profile, weightInput, heightCmInput, heightFt, heightIn]);

  const dirty = useMemo(() => {
    if (!profile) return false;
    return (
      !numClose(parsedFromForm.weightKg, profile.body_weight) ||
      !numClose(parsedFromForm.heightCm, profile.height)
    );
  }, [parsedFromForm, profile]);

  const save = useCallback(() => {
    if (!profile || !dirty) return;
    setError(null);
    startTransition(async () => {
      if (!numClose(parsedFromForm.weightKg, profile.body_weight)) {
        const res = await updateProfileField("body_weight", parsedFromForm.weightKg);
        if (res.error) {
          setError(res.error);
          return;
        }
      }
      if (!numClose(parsedFromForm.heightCm, profile.height)) {
        const res = await updateProfileField("height", parsedFromForm.heightCm);
        if (res.error) {
          setError(res.error);
          return;
        }
      }
      router.refresh();
    });
  }, [dirty, parsedFromForm, profile, router]);

  if (!profile) {
    return <p className="text-sm text-zinc-400">Loading profile…</p>;
  }

  const u = profile.units ?? "metric";

  return (
    <div className="flex min-h-[60vh] flex-col px-1 pb-8 pt-2">
      <div className="flex-1 space-y-6">
        {error && (
          <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <div>
          <label htmlFor="settings-body-weight" className={labelClass}>
            Body weight
          </label>
          <input
            id="settings-body-weight"
            type="number"
            min={u === "metric" ? 30 : 70}
            max={u === "metric" ? 250 : 550}
            step={u === "metric" ? 0.1 : 1}
            className={inputClass}
            placeholder={u === "metric" ? "e.g. 75" : "e.g. 165"}
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
          />
          <p className="mt-1 text-xs text-zinc-500">{u === "metric" ? "kg" : "lb"}</p>
        </div>

        <div>
          <label className={labelClass}>Height</label>
          {u === "metric" ? (
            <>
              <input
                id="settings-height-cm"
                type="number"
                min={120}
                max={230}
                className={inputClass}
                placeholder="e.g. 175"
                value={heightCmInput}
                onChange={(e) => setHeightCmInput(e.target.value)}
              />
              <p className="mt-1 text-xs text-zinc-500">cm</p>
            </>
          ) : (
            <div className="flex gap-2">
              <input
                id="settings-height-ft"
                type="number"
                min={4}
                max={7}
                className={inputClass}
                placeholder="ft"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
              />
              <input
                id="settings-height-in"
                type="number"
                min={0}
                max={11}
                className={inputClass}
                placeholder="in"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
              />
            </div>
          )}
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
