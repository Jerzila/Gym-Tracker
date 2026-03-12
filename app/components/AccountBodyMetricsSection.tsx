"use client";

import { useState, useCallback } from "react";
import { updateProfileField } from "@/app/actions/profile";
import { kgToLb, lbToKg, cmToFeetInches, feetInchesToCm } from "@/lib/units";
import type { Profile } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";
const labelClass = "block text-sm font-medium text-zinc-400 mb-1";

export function AccountBodyMetricsSection({ profile }: { profile: Profile | null }) {
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"body_weight" | "height" | null>(null);

  const handleSave = useCallback(
    async (field: "body_weight" | "height", value: number | null) => {
      setFieldError(null);
      setSaving(field);
      const res = await updateProfileField(field, value);
      setSaving(null);
      if (res.error) setFieldError(res.error);
    },
    []
  );

  if (!profile) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="mb-4 text-sm uppercase tracking-wide text-zinc-400">
          Body Metrics
        </h2>
        <p className="text-sm text-zinc-400">Loading…</p>
      </section>
    );
  }

  const units = profile.units ?? "metric";
  const weightKg = profile.body_weight ?? 0;
  const heightCm = profile.height ?? 0;
  const { feet: heightFt, inches: heightIn } = cmToFeetInches(heightCm);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="mb-4 text-sm uppercase tracking-wide text-zinc-400">
        Body Metrics
      </h2>

      {fieldError && (
        <p className="mb-3 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {fieldError}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="account-body-weight" className={labelClass}>
            Body Weight
          </label>
          <input
            id="account-body-weight"
            type="number"
            min={units === "metric" ? 30 : 70}
            max={units === "metric" ? 250 : 550}
            step={units === "metric" ? 0.1 : 1}
            className={inputClass}
            placeholder={units === "metric" ? "e.g. 75" : "e.g. 165"}
            defaultValue={units === "metric" ? (weightKg || "") : (weightKg ? kgToLb(weightKg) : "")}
            onBlur={(e) => {
              const v = e.target.value;
              if (v === "") {
                handleSave("body_weight", null);
                return;
              }
              const n = Number(v);
              handleSave("body_weight", units === "metric" ? n : lbToKg(n));
            }}
          />
          <p className="mt-1 text-xs text-zinc-500">
            {units === "metric" ? "kg" : "lb"}
          </p>
          {saving === "body_weight" && (
            <p className="mt-1 text-xs text-zinc-500">Saving…</p>
          )}
        </div>

        <div>
          <label htmlFor="account-height-ft" className={labelClass}>
            Height (ft / in)
          </label>
          {units === "metric" ? (
            <>
              <input
                id="account-height"
                type="number"
                min={120}
                max={230}
                className={inputClass}
                placeholder="e.g. 175"
                defaultValue={heightCm || ""}
                onBlur={(e) => {
                  const v = e.target.value;
                  handleSave("height", v === "" ? null : Number(v));
                }}
              />
              <p className="mt-1 text-xs text-zinc-500">cm</p>
            </>
          ) : (
            <div className="flex gap-2">
              <input
                id="account-height-ft"
                type="number"
                min={4}
                max={7}
                className={inputClass}
                placeholder="ft"
                defaultValue={heightFt || ""}
                onBlur={(e) => {
                  const ft = Number(e.target.value) || 0;
                  const inVal = Number((document.getElementById("account-height-in") as HTMLInputElement)?.value) || 0;
                  const cm = feetInchesToCm(ft, inVal);
                  if (cm >= 120 && cm <= 230) handleSave("height", cm);
                }}
              />
              <input
                id="account-height-in"
                type="number"
                min={0}
                max={11}
                className={inputClass}
                placeholder="in"
                defaultValue={heightIn || ""}
                onBlur={(e) => {
                  const inVal = Number(e.target.value) || 0;
                  const ft = Number((document.getElementById("account-height-ft") as HTMLInputElement)?.value) || 0;
                  const cm = feetInchesToCm(ft, inVal);
                  if (cm >= 120 && cm <= 230) handleSave("height", cm);
                }}
              />
            </div>
          )}
          {saving === "height" && (
            <p className="mt-1 text-xs text-zinc-500">Saving…</p>
          )}
        </div>
      </div>
    </section>
  );
}
