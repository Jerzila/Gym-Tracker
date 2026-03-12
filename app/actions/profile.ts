"use server";

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAgeFromBirthday } from "@/lib/age";
import type { Profile } from "@/lib/types";
import { ensureFirstBodyweightLog } from "@/app/actions/bodyweight";

const AGE_MIN = 13;
const AGE_MAX = 90;
const BODY_WEIGHT_MIN = 30;
const BODY_WEIGHT_MAX = 250;
const HEIGHT_MIN = 120;
const HEIGHT_MAX = 230;

export type ProfileFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseBirthday(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : s;
}

function validateBirthdayAge(birthday: string | null): string | undefined {
  if (!birthday) return undefined;
  const age = getAgeFromBirthday(birthday);
  if (age === null) return "Invalid date.";
  if (age < AGE_MIN || age > AGE_MAX)
    return `Birthday must give an age between ${AGE_MIN} and ${AGE_MAX} years.`;
  return undefined;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function updateProfileField(
  field: keyof Pick<Profile, "name" | "birthday" | "gender" | "country" | "body_weight" | "height" | "units">,
  value: string | number | null
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let sanitized: string | number | null = value;
  if (field === "birthday") {
    const b = parseBirthday(value);
    if (b !== null) {
      const err = validateBirthdayAge(b);
      if (err) return { error: err };
    }
    sanitized = b;
  }
  if (field === "body_weight") {
    const n = parseNumber(value);
    if (n !== null && (n < BODY_WEIGHT_MIN || n > BODY_WEIGHT_MAX))
      return { error: `Body weight must be between ${BODY_WEIGHT_MIN} and ${BODY_WEIGHT_MAX} kg` };
    sanitized = n;
  }
  if (field === "height") {
    const n = parseNumber(value);
    if (n !== null && (n < HEIGHT_MIN || n > HEIGHT_MAX))
      return { error: `Height must be between ${HEIGHT_MIN} and ${HEIGHT_MAX} cm` };
    sanitized = n;
  }
  if (field === "gender" && value !== null && value !== "") {
    const allowed = ["male", "female", "other", "prefer_not_to_say"];
    if (!allowed.includes(String(value))) return { error: "Invalid gender" };
  }
  if (field === "units") {
    if (value !== "metric" && value !== "imperial")
      return { error: "Invalid units. Choose metric or imperial." };
    sanitized = value;
  }

  const payload: Record<string, unknown> = {
    [field]: sanitized === "" ? null : sanitized,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };
  return {};
}

export async function completeProfileSetup(formData: FormData): Promise<ProfileFormState | void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const name = (formData.get("name") as string)?.trim() || null;
  const birthdayRaw = formData.get("birthday");
  const genderRaw = formData.get("gender");
  const country = (formData.get("country") as string)?.trim() || null;
  const bodyWeightRaw = formData.get("body_weight");
  const heightRaw = formData.get("height");

  const fieldErrors: Record<string, string> = {};
  const birthday = parseBirthday(birthdayRaw);
  const birthdayErr = birthday ? validateBirthdayAge(birthday) : undefined;
  if (birthdayErr) fieldErrors.birthday = birthdayErr;
  const bodyWeight = parseNumber(bodyWeightRaw);
  if (bodyWeight !== null && (bodyWeight < BODY_WEIGHT_MIN || bodyWeight > BODY_WEIGHT_MAX)) {
    fieldErrors.body_weight = `Body weight must be between ${BODY_WEIGHT_MIN} and ${BODY_WEIGHT_MAX} kg.`;
  }
  const height = parseNumber(heightRaw);
  if (height !== null && (height < HEIGHT_MIN || height > HEIGHT_MAX)) {
    fieldErrors.height = `Height must be between ${HEIGHT_MIN} and ${HEIGHT_MAX} cm.`;
  }

  const gender =
    genderRaw === "male" || genderRaw === "female" || genderRaw === "other" || genderRaw === "prefer_not_to_say"
      ? genderRaw
      : null;

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const payload = {
    id: user.id,
    name: name || null,
    birthday,
    gender,
    country: country || null,
    body_weight: bodyWeight,
    height,
    profile_completed: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/");
}

export type CompleteOnboardingInput = {
  name: string | null;
  birthday: string;
  height: number;
  weight: number;
  units: "metric" | "imperial";
  gender: "male" | "female" | "prefer_not_to_say" | null;
  country: string | null;
};

export async function completeOnboarding(
  input: CompleteOnboardingInput
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const birthdayErr = validateBirthdayAge(input.birthday);
  if (birthdayErr) return { error: birthdayErr };
  if (
    input.height < HEIGHT_MIN ||
    input.height > HEIGHT_MAX ||
    input.weight < BODY_WEIGHT_MIN ||
    input.weight > BODY_WEIGHT_MAX
  ) {
    return { error: "Invalid height or weight." };
  }
  if (input.units !== "metric" && input.units !== "imperial") {
    return { error: "Invalid units." };
  }

  const payload = {
    id: user.id,
    name: input.name || null,
    birthday: input.birthday,
    height: input.height,
    body_weight: input.weight,
    units: input.units,
    gender: input.gender || null,
    country: input.country || null,
    profile_completed: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) return { error: error.message };

  const logResult = await ensureFirstBodyweightLog(input.weight);
  if (logResult.error) return { error: logResult.error };

  revalidatePath("/", "layout");
  return {};
}
