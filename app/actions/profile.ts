"use server";

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAgeFromBirthday } from "@/lib/age";
import type { Profile } from "@/lib/types";
import { ensureFirstBodyweightLog } from "@/app/actions/bodyweight";
import { refreshUserRankingsSafe } from "@/lib/refreshUserRankingsSafe";
import {
  baseUsernameFromName,
  candidateUsername,
  getUsernameChangeCooldownState,
  normalizeUsernameInput,
  USERNAME_CHANGE_COOLDOWN_ERROR_MESSAGE,
  validateUsernameFormat,
} from "@/lib/username";
import { calculateFFMI, getFFMICategory } from "@/lib/ffmi";

const AGE_MIN = 13;
const AGE_MAX = 90;
const BODY_WEIGHT_MIN = 30;
const BODY_WEIGHT_MAX = 250;
const HEIGHT_MIN = 120;
const HEIGHT_MAX = 230;
const BODY_FAT_PCT_MIN = 3;
const BODY_FAT_PCT_MAX = 50;

export type ProfileFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function buildFallbackUsername(): string {
  return `user${Math.floor(Math.random() * 100000)}`;
}

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
  try {
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

    if (error || !data) {
      console.error("[profile] onboarding initialization failed: unable to load profile", error);
      return null;
    }
    return data as Profile;
  } catch (error) {
    console.error("[profile] onboarding initialization failed: unexpected error", error);
    return null;
  }
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

  const trimmedName = nameForUsername?.trim() ?? "";
  const base = trimmedName ? baseUsernameFromName(trimmedName) : buildFallbackUsername();
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
  try {
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

    // 1) Convert/capture bytes from the cropped file.
    const buf = Buffer.from(await file.arrayBuffer());

    // 2) Upload to avatars bucket using per-user folder key (policy-friendly).
    const path = `${user.id}/avatar.jpg`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, buf, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (upErr) {
      console.error("[profile] Avatar upload failed:", upErr);
      const msg = upErr.message.toLowerCase();
      if (msg.includes("bucket") || msg.includes("not found")) {
        return { error: "Avatar storage is not configured. Please try again later." };
      }
      if (msg.includes("row-level security") || msg.includes("policy")) {
        return { error: "Avatar upload is not allowed by storage policy." };
      }
      return { error: "Failed to upload profile picture." };
    }

    // 3) Resolve public URL.
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    // 4) Persist URL to profile row.
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (dbErr) {
      console.error("[profile] Avatar URL update failed:", dbErr);
      return { error: "Failed to save profile photo." };
    }

    revalidatePath("/", "layout");
    revalidatePath("/account");
    revalidatePath("/account/settings");
    revalidatePath("/account/edit-profile");
    return { avatar_url: publicUrl };
  } catch (error) {
    console.error("[profile] Avatar upload crashed:", error);
    return { error: "Failed to upload profile picture." };
  }
}

export async function removeAvatar(): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/account/settings");
  revalidatePath("/account/edit-profile");
  return {};
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

  if (field === "body_weight") {
    await refreshUserRankingsSafe(user.id);
  }

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

  try {
    const { error: upError } = await upsertProfileWithUsername(supabase, payload, name, user.id);
    if (upError) {
      console.error("[profile] setup save failed: profile upsert failed", upError);
      return { error: upError.message };
    }

    if (bodyWeight !== null && bodyWeight > 0) {
      const logResult = await ensureFirstBodyweightLog(bodyWeight, {
        source: "setup",
        date: setupLogDate,
      });
      if (logResult.error) {
        console.error("[profile] setup save failed: onboarding initialization failed", logResult.error);
        return { error: logResult.error };
      }
    }
    await refreshUserRankingsSafe(user.id);
  } catch (error) {
    console.error("[profile] setup save failed: unexpected error", error);
    return { error: "Setup failed. Please try again." };
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
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const birthdayErr = validateBirthdayAge(input.birthday);
    if (birthdayErr) return { error: birthdayErr };

    const height = Number(input.height);
    const weight = Number(input.weight);
    if (
      !Number.isFinite(height) ||
      !Number.isFinite(weight) ||
      height < HEIGHT_MIN ||
      height > HEIGHT_MAX ||
      weight < BODY_WEIGHT_MIN ||
      weight > BODY_WEIGHT_MAX
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
      height,
      body_weight: weight,
      units: input.units,
      gender: input.gender || null,
      country: input.country || null,
      profile_completed: true,
      updated_at: updatedAt,
    };

    const { error: upError } = await upsertProfileWithUsername(supabase, payload, input.name, user.id);
    if (upError) {
      console.error("[profile] setup save failed: profile upsert failed", upError);
      return { error: upError.message };
    }

    const logResult = await ensureFirstBodyweightLog(weight, {
      source: "setup",
      date: setupLogDate,
    });
    if (logResult.error) {
      console.error("[profile] setup save failed: onboarding initialization failed", logResult.error);
    }

    await refreshUserRankingsSafe(user.id);

    revalidatePath("/", "layout");
    revalidatePath("/account");
    revalidatePath("/bodyweight");
    return {};
  } catch (error) {
    console.error("[profile] setup save failed: unexpected error", error);
    return { error: "Setup failed. Please try again." };
  }
}

export type SaveCalculatedFFMIResult =
  | { ok: true; ffmi: number; categoryLabel: string }
  | { ok: false; error: string };

/**
 * Computes FFMI from latest logged weight (or profile fallback), profile height, and user-supplied body fat %.
 * Persists `ffmi` and `body_fat_percent` on the profile.
 */
export async function saveCalculatedFFMI(bodyFatPercentInput: number): Promise<SaveCalculatedFFMIResult> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in." };

    const bodyFat = Number(bodyFatPercentInput);
    if (
      !Number.isFinite(bodyFat) ||
      bodyFat < BODY_FAT_PCT_MIN ||
      bodyFat > BODY_FAT_PCT_MAX
    ) {
      return {
        ok: false,
        error: `Body fat must be between ${BODY_FAT_PCT_MIN}% and ${BODY_FAT_PCT_MAX}%.`,
      };
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("height, body_weight, gender")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      return { ok: false, error: "Could not load your profile." };
    }

    const heightCm = profile.height != null ? Number(profile.height) : null;
    if (heightCm == null || heightCm <= 0) {
      return { ok: false, error: "Add your height in settings first." };
    }

    const { data: logRows, error: logErr } = await supabase
      .from("bodyweight_logs")
      .select("weight")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (logErr) {
      console.error("[profile] saveCalculatedFFMI bodyweight fetch failed", logErr);
      return { ok: false, error: "Could not load your latest weight." };
    }

    const logWeight = logRows?.[0]?.weight != null ? Number(logRows[0].weight) : null;
    const profileWeight = profile.body_weight != null ? Number(profile.body_weight) : null;
    const weightKg = logWeight != null && logWeight > 0 ? logWeight : profileWeight;
    if (weightKg == null || weightKg <= 0) {
      return { ok: false, error: "Log your weight to calculate FFMI." };
    }

    const ffmi = calculateFFMI(weightKg, heightCm, bodyFat);
    if (ffmi == null) {
      return { ok: false, error: "Could not calculate FFMI. Check your inputs." };
    }

    const categoryLabel = getFFMICategory(ffmi, profile.gender).label;
    const updatedAt = new Date().toISOString();

    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        ffmi,
        body_fat_percent: bodyFat,
        updated_at: updatedAt,
      })
      .eq("id", user.id);

    if (upErr) {
      console.error("[profile] saveCalculatedFFMI update failed", upErr);
      return { ok: false, error: upErr.message };
    }

    revalidatePath("/", "layout");
    revalidatePath("/account");
    return { ok: true, ffmi, categoryLabel };
  } catch (e) {
    console.error("[profile] saveCalculatedFFMI unexpected", e);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}
