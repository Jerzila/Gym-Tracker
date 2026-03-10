"use client";

import { useState, useCallback, useEffect } from "react";
import { updateProfileField } from "@/app/actions/profile";
import { COUNTRIES, getFlagEmoji } from "@/lib/countries";
import { getAgeFromBirthday } from "@/lib/age";
import { kgToLb, lbToKg, cmToFeetInches, feetInchesToCm } from "@/lib/units";
import type { Profile } from "@/lib/types";

const GENDER_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";
const labelClass = "block text-sm font-medium text-zinc-400 mb-1";
const errorClass = "mt-1 text-sm text-red-400";

type ProfileField = keyof Pick<
  Profile,
  "name" | "birthday" | "gender" | "country" | "body_weight" | "height"
>;

export function AccountProfileSection({ profile }: { profile: Profile | null }) {
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState<ProfileField | null>(null);
  const [birthdayDisplay, setBirthdayDisplay] = useState<string>(profile?.birthday ?? "");

  useEffect(() => {
    setBirthdayDisplay(profile?.birthday ?? "");
  }, [profile?.birthday]);

  const handleSave = useCallback(
    async (field: ProfileField, value: string | number | null) => {
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
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Profile
        </h2>
        <p className="text-sm text-zinc-400">Loading profile…</p>
      </section>
    );
  }

  const units = profile.units ?? "metric";
  const weightKg = profile.body_weight ?? 0;
  const heightCm = profile.height ?? 0;
  const { feet: heightFt, inches: heightIn } = cmToFeetInches(heightCm);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Profile
      </h2>
      <p className="mb-4 text-sm text-zinc-400">
        Manage your profile. Changes save automatically.
      </p>

      {fieldError && (
        <p className="mb-3 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {fieldError}
        </p>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="account-name" className={labelClass}>
            Name
          </label>
          <input
            id="account-name"
            type="text"
            className={inputClass}
            placeholder="Your name"
            defaultValue={profile.name ?? ""}
            onBlur={(e) => handleSave("name", e.target.value.trim() || null)}
          />
        </div>

        <div>
          <label htmlFor="account-birthday" className={labelClass}>
            Birthday
          </label>
          <input
            id="account-birthday"
            type="date"
            className={inputClass}
            value={birthdayDisplay}
            onChange={(e) => setBirthdayDisplay(e.target.value)}
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              setBirthdayDisplay(v ?? "");
              handleSave("birthday", v);
            }}
          />
          {birthdayDisplay && (
            <p className="mt-1.5 text-sm text-zinc-400">
              Current age: <strong className="text-zinc-300">{getAgeFromBirthday(birthdayDisplay) ?? "—"} years old</strong>
            </p>
          )}
          {saving === "birthday" && (
            <p className="mt-1 text-xs text-zinc-500">Saving…</p>
          )}
        </div>

        <div>
          <label htmlFor="account-gender" className={labelClass}>
            Gender
          </label>
          <select
            id="account-gender"
            className={inputClass}
            defaultValue={profile.gender ?? ""}
            onChange={(e) =>
              handleSave(
                "gender",
                e.target.value || null
              )
            }
          >
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value || "empty"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="account-country" className={labelClass}>
            Country
          </label>
          <select
            id="account-country"
            className={inputClass}
            defaultValue={profile.country ?? ""}
            onChange={(e) => handleSave("country", e.target.value || null)}
          >
            <option value="">Select…</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {getFlagEmoji(c.code)} {c.name}
              </option>
            ))}
          </select>
        </div>

        <div key={`weight-${units}`}>
          <label htmlFor="account-body-weight" className={labelClass}>
            Body Weight ({units === "metric" ? "kg" : "lb"})
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
          {saving === "body_weight" && (
            <p className="mt-1 text-xs text-zinc-500">Saving…</p>
          )}
        </div>

        <div key={`height-${units}`}>
          <label htmlFor="account-height" className={labelClass}>
            Height ({units === "metric" ? "cm" : "ft"})
          </label>
          {units === "metric" ? (
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
