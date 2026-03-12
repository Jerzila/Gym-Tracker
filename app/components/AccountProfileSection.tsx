"use client";

import { useState, useCallback, useEffect } from "react";
import { updateProfileField } from "@/app/actions/profile";
import { COUNTRIES, getFlagEmoji } from "@/lib/countries";
import { getAgeFromBirthday } from "@/lib/age";
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

type ProfileField = keyof Pick<Profile, "name" | "birthday" | "gender" | "country">;

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
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="mb-4 text-sm uppercase tracking-wide text-zinc-400">
          Profile
        </h2>
        <p className="text-sm text-zinc-400">Loading profile…</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="mb-4 text-sm uppercase tracking-wide text-zinc-400">
        Profile
      </h2>

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
      </div>
    </section>
  );
}
