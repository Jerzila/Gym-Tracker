"use server";

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAgeFromBirthday } from "@/lib/age";
import type { Profile } from "@/lib/types";
import { ensureFirstBodyweightLog } from "@/app/actions/bodyweight";
import {
  baseUsernameFromName,
  candidateUsername,
  getUsernameChangeCooldownState,
  normalizeUsernameInput,
  USERNAME_CHANGE_COOLDOWN_ERROR_MESSAGE,
  validateUsernameFormat,
} from "@/lib/username";

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

/**
 * One-time style backfill: assign a unique lowercase username from `name` when missing.
 */
export async function ensureUsernameBackfill(profile: Profile | null): Promise<Profile | null> {
  if (!profile?.id || profile.username) return profile;

  const supabase = await createServerClient();
  const base = baseUsernameFromName(profile.name);

  for (let i = 0; i < 500; i++) {
    const candidate = candidateUsername(base, i);
    const updatedAt = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({ username: candidate, updated_at: updatedAt })
      .eq("id", profile.id)
      .is("username", null)
      .select("*")
      .maybeSingle();

    if (updated) {
      revalidatePath("/", "layout");
      revalidatePath("/account");
      return updated as Profile;
    }

    const { data: row } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profile.id)
      .maybeSingle();
    if (row?.username) return row as Profile;

    if (error?.code === "23505") continue;
  }

  return profile;
}

async function upsertProfileWithUsername(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  payload: Record<string, unknown>,
  nameForUsername: string | null,
  userId: string
): Promise<{ error?: { message: string; code?: string } }> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (existing?.username) {
    const { error } = await supabase.from("profiles").upsert(
      { ...payload, username: existing.username },
      { onConflict: "id" }
    );
    if (error) return { error: { message: error.message, code: error.code } };
    return {};
  }

  const base = baseUsernameFromName(nameForUsername);
  for (let i = 0; i < 200; i++) {
    const username = candidateUsername(base, i);
    const { error } = await supabase.from("profiles").upsert(
      { ...payload, username },
      { onConflict: "id" }
    );
    if (!error) return {};
    if (error.code === "23505") continue;
    return { error: { message: error.message, code: error.code } };
  }
  return { error: { message: "Could not assign a unique username." } };
}

export async function updateUsername(raw: string): Promise<{ error?: string }> {
  const formatErr = validateUsernameFormat(raw);
  if (formatErr) return { error: formatErr };

  const username = normalizeUsernameInput(raw);
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: row, error: rowErr } = await supabase
    .from("profiles")
    .select("username, username_last_changed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (rowErr || !row) return { error: "Profile not found." };

  if (row.username === username) {
    return {};
  }

  const cooldown = getUsernameChangeCooldownState(row.username_last_changed_at);
  if (!cooldown.canChange && cooldown.daysRemaining != null) {
    return { error: USERNAME_CHANGE_COOLDOWN_ERROR_MESSAGE };
  }

  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (taken) return { error: "This username is already taken." };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      username_last_changed_at: now,
      updated_at: now,
    })
    .eq("id", user.id);

  if (error?.code === "23505") return { error: "This username is already taken." };
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/account/settings");
  revalidatePath("/account/edit-profile");
  return {};
}

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function uploadAvatar(
  formData: FormData
): Promise<{ error?: string; avatar_url?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const file = formData.get("avatar");
  if (!file || !(file instanceof Blob) || file.size === 0) {
    return { error: "Choose an image file." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { error: "Image must be 5 MB or smaller." };
  }

  const mime = file.type;
  const ext = AVATAR_TYPES[mime];
  if (!ext) return { error: "Use JPEG, PNG, WebP, or GIF." };

  const buf = Buffer.from(await file.arrayBuffer());
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("avatars").upload(path, buf, {
    contentType: mime,
    upsert: false,
  });

  if (upErr) return { error: upErr.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error: dbErr } = await supabase
    .from("profiles")
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (dbErr) return { error: dbErr.message };

  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/account/settings");
  revalidatePath("/account/edit-profile");
  return { avatar_url: publicUrl };
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

  revalidatePath("/account");
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

  const updatedAt = new Date().toISOString();
  const clientLogDate = (formData.get("setup_log_date") as string)?.trim();
  const setupLogDate =
    clientLogDate && /^\d{4}-\d{2}-\d{2}$/.test(clientLogDate)
      ? clientLogDate
      : updatedAt.slice(0, 10);
  const payload = {
    id: user.id,
    name: name || null,
    birthday,
    gender,
    country: country || null,
    body_weight: bodyWeight,
    height,
    profile_completed: true,
    updated_at: updatedAt,
  };

  const { error: upError } = await upsertProfileWithUsername(supabase, payload, name, user.id);
  if (upError) return { error: upError.message };

  if (bodyWeight !== null && bodyWeight > 0) {
    const logResult = await ensureFirstBodyweightLog(bodyWeight, {
      source: "setup",
      date: setupLogDate,
    });
    if (logResult.error) return { error: logResult.error };
  }

  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/bodyweight");
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
  /** Local calendar date YYYY-MM-DD when the user taps Finish (client timezone). */
  logDate: string;
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

  const logRaw = input.logDate?.trim() ?? "";
  const setupLogDate = /^\d{4}-\d{2}-\d{2}$/.test(logRaw) ? logRaw : new Date().toISOString().slice(0, 10);

  const updatedAt = new Date().toISOString();
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
    updated_at: updatedAt,
  };

  const { error: upError } = await upsertProfileWithUsername(supabase, payload, input.name, user.id);
  if (upError) return { error: upError.message };

  const logResult = await ensureFirstBodyweightLog(input.weight, {
    source: "setup",
    date: setupLogDate,
  });
  if (logResult.error) return { error: logResult.error };

  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/bodyweight");
  return {};
}
