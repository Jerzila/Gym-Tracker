"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { updateProfileField } from "@/app/actions/profile";
import { buttonClass } from "@/app/components/Button";
import { COUNTRIES } from "@/lib/countries";
import { getAgeFromBirthday } from "@/lib/age";
import type { Profile } from "@/lib/types";
import { FlagIcon } from "@/app/components/FlagIcon";

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

export function SettingsAboutForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setBirthday(profile.birthday ?? "");
    setGender(profile.gender ?? "");
    setCountry(profile.country ?? "");
  }, [profile?.id, profile?.name, profile?.birthday, profile?.gender, profile?.country, profile?.updated_at]);

  const nameNow = name.trim() || null;
  const birthdayNow = birthday.trim() || null;
  const genderNow = gender === "" ? null : gender;
  const countryNow = country === "" ? null : country;

  const dirty =
    !!profile &&
    (nameNow !== (profile.name ?? null) ||
      birthdayNow !== (profile.birthday ?? null) ||
      genderNow !== (profile.gender ?? null) ||
      countryNow !== (profile.country ?? null));

  const save = useCallback(() => {
    if (!profile || !dirty) return;
    setError(null);
    startTransition(async () => {
      const fields: Array<{
        field: "name" | "birthday" | "gender" | "country";
        value: string | null;
      }> = [
        { field: "name", value: nameNow },
        { field: "birthday", value: birthdayNow },
        { field: "gender", value: genderNow },
        { field: "country", value: countryNow },
      ];

      for (const { field, value } of fields) {
        const prev =
          field === "name"
            ? profile.name
            : field === "birthday"
              ? profile.birthday
              : field === "gender"
                ? profile.gender
                : profile.country;
        const next = value;
        const same = prev === next || (prev == null && next == null);
        if (same) continue;

        const res = await updateProfileField(field, next);
        if (res.error) {
          setError(res.error);
          return;
        }
      }

      router.refresh();
    });
  }, [birthdayNow, countryNow, dirty, genderNow, nameNow, profile, router]);

  if (!profile) {
    return <p className="text-sm text-zinc-400">Loading profile…</p>;
  }

  return (
    <div className="flex min-h-[60vh] flex-col px-1 pb-8 pt-2">
      <div className="flex-1 space-y-4">
        {error && (
          <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <div>
          <label htmlFor="settings-about-name" className={labelClass}>
            Name
          </label>
          <input
            id="settings-about-name"
            type="text"
            className={inputClass}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="settings-about-birthday" className={labelClass}>
            Birthday
          </label>
          <input
            id="settings-about-birthday"
            type="date"
            className={inputClass}
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
          {birthday && (
            <p className="mt-1.5 text-sm text-zinc-400">
              Current age:{" "}
              <strong className="text-zinc-300">
                {getAgeFromBirthday(birthday) ?? "—"} years old
              </strong>
            </p>
          )}
        </div>

        <div>
          <label htmlFor="settings-about-gender" className={labelClass}>
            Gender
          </label>
          <select
            id="settings-about-gender"
            className={inputClass}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value || "empty"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="settings-about-country" className={labelClass}>
            Country
          </label>
        <div className="relative">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
            <FlagIcon code={country} />
          </div>
          <select
            id="settings-about-country"
            className={`${inputClass} pl-11`}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">Select…</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
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
