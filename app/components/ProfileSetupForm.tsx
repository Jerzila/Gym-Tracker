"use client";

import { useActionState, useState } from "react";
import { completeProfileSetup } from "@/app/actions/profile";
import { buttonClass } from "@/app/components/Button";
import { COUNTRIES, getFlagEmoji } from "@/lib/countries";
import { getAgeFromBirthday } from "@/lib/age";
import type { Profile } from "@/lib/types";
import { localCalendarDateYYYYMMDD } from "@/lib/localCalendarDate";

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

type ProfileSetupFormProps = { profile: Profile | null };

export function ProfileSetupForm({ profile }: ProfileSetupFormProps) {
  const [birthday, setBirthday] = useState<string>(profile?.birthday ?? "");
  const [state, formAction] = useActionState(
    async (_: unknown, formData: FormData) => completeProfileSetup(formData),
    null as { error?: string; fieldErrors?: Record<string, string> } | null
  );

  const currentAge = getAgeFromBirthday(birthday || null);

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={(e) => {
        const form = e.currentTarget;
        const el = form.elements.namedItem("setup_log_date");
        if (el instanceof HTMLInputElement) {
          el.value = localCalendarDateYYYYMMDD();
        }
      }}
    >
      <input type="hidden" name="setup_log_date" defaultValue="" />
      <div>
        <label htmlFor="name" className={labelClass}>
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          className={inputClass}
          placeholder="Your name"
          defaultValue={profile?.name ?? ""}
        />
      </div>

      <div>
        <label htmlFor="birthday" className={labelClass}>
          Birthday
        </label>
        <input
          id="birthday"
          name="birthday"
          type="date"
          className={inputClass}
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
        />
        {currentAge !== null && (
          <p className="mt-1.5 text-sm text-zinc-400">
            Current age: <strong className="text-zinc-300">{currentAge} years old</strong>
          </p>
        )}
        {state?.fieldErrors?.birthday && (
          <p className={errorClass}>{state.fieldErrors.birthday}</p>
        )}
      </div>

      <div>
        <label htmlFor="gender" className={labelClass}>
          Gender
        </label>
        <select
          id="gender"
          name="gender"
          className={inputClass}
          defaultValue={profile?.gender ?? ""}
        >
          {GENDER_OPTIONS.map((o) => (
            <option key={o.value || "empty"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="country" className={labelClass}>
          Country
        </label>
        <select
          id="country"
          name="country"
          className={inputClass}
          defaultValue={profile?.country ?? ""}
        >
          <option value="">Select…</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {getFlagEmoji(c.code)} {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="body_weight" className={labelClass}>
          Body Weight (kg)
        </label>
        <input
          id="body_weight"
          name="body_weight"
          type="number"
          min={30}
          max={250}
          step={0.1}
          className={inputClass}
          placeholder="e.g. 75"
          defaultValue={profile?.body_weight ?? ""}
        />
        {state?.fieldErrors?.body_weight && (
          <p className={errorClass}>{state.fieldErrors.body_weight}</p>
        )}
      </div>

      <div>
        <label htmlFor="height" className={labelClass}>
          Height (cm)
        </label>
        <input
          id="height"
          name="height"
          type="number"
          min={120}
          max={230}
          className={inputClass}
          placeholder="e.g. 175"
          defaultValue={profile?.height ?? ""}
        />
        {state?.fieldErrors?.height && (
          <p className={errorClass}>{state.fieldErrors.height}</p>
        )}
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button type="submit" className={`${buttonClass.primary} w-full`}>
        Continue
      </button>
    </form>
  );
}
