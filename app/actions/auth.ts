"use server";

import { headers } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function logServerError(context: string, err: unknown) {
  console.error(`[auth] ${context}`, err);
}

function buildFallbackUsername(): string {
  return `user${Math.floor(Math.random() * 100000)}`;
}

export async function signUp(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const legalAgreement = formData.get("legalAgreement");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (legalAgreement !== "on") {
    return { error: "You must agree to the Terms of Service and Privacy Policy to continue." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    const user = data.user;
    if (user) {
      const emailPrefix = email.split("@")[0]?.trim() ?? "";
      const usernameSeed = emailPrefix.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
      const username = usernameSeed.length >= 3 ? usernameSeed.slice(0, 20) : buildFallbackUsername();

      try {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({ id: user.id, username }, { onConflict: "id" });
        if (profileError) {
          console.error("[auth] profile creation failed after signup", profileError);
        }
      } catch (profileInsertErr) {
        console.error("[auth] profile creation threw after signup", profileInsertErr);
      }
    } else {
      console.error("[auth] onboarding initialization failed: signup returned no user");
    }
  } catch (err) {
    logServerError("signUp failed", err);
    return { error: "Unable to create account. Please try again." };
  }

  redirect("/profile-setup");
}

export async function signIn(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirect") as string)?.trim() || "/";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (err) {
    logServerError("signIn failed", err);
    return { error: "Unable to sign in. Please check your email and password." };
  }

  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function signOut() {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (err) {
    logServerError("signOut failed", err);
  }
  redirect("/login");
}

export async function getUser() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (err) {
    logServerError("getUser failed", err);
    return null;
  }
}

/** Send password reset email using the signed-in user’s address (never shown in the UI). */
export async function sendPasswordResetForSessionUser(): Promise<{
  error?: string;
  success?: boolean;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user?.email) {
      return { error: "Unable to send reset link." };
    }

    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
    const protocol = headersList.get("x-forwarded-proto") ?? "https";
    const origin = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: origin ? `${origin}/reset-password` : undefined,
    });
    if (error) throw error;

    return { success: true };
  } catch (err) {
    logServerError("sendPasswordResetForSessionUser failed", err);
    return { error: "Unable to send reset link. Please try again." };
  }
}

export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  if (!email) {
    return { error: "Email is required." };
  }

  try {
    const supabase = await createServerClient();
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
    const protocol = headersList.get("x-forwarded-proto") ?? "https";
    const origin = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: origin ? `${origin}/reset-password` : undefined,
    });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    logServerError("requestPasswordReset failed", err);
    return { error: "Unable to send reset link. Please try again." };
  }
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || !confirm) {
    return { error: "Password and confirmation are required." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    logServerError("updatePassword failed", err);
    return { error: "Unable to update password right now. Please try again." };
  }
}

function createSupabaseAdminClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  if (!url || !serviceRoleKey) {
    throw new Error("Missing admin Supabase env for account deletion.");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function deleteUserRows(supabase: Awaited<ReturnType<typeof createServerClient>>, userId: string) {
  const deleteFromUserIdTable = async (table: string) => {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error && error.code !== "42P01") {
      throw new Error(error.message);
    }
  };

  await deleteFromUserIdTable("sets");
  await deleteFromUserIdTable("workouts");
  await deleteFromUserIdTable("exercises");
  await deleteFromUserIdTable("bodyweight_logs");
  await deleteFromUserIdTable("rankings");

  const { error: profileDeleteError } = await supabase.from("profiles").delete().eq("id", userId);
  if (profileDeleteError && profileDeleteError.code !== "42P01") {
    throw new Error(profileDeleteError.message);
  }
}

export async function deleteAccount(formData: FormData) {
  const password = (formData.get("password") as string)?.trim();
  if (!password) {
    return { error: "Password is required to delete your account." };
  }

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user?.id || !user.email) {
      return { error: "You must be signed in to delete your account." };
    }

    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (passwordError) {
      return { error: "Incorrect password. Please try again." };
    }

    await deleteUserRows(supabase, user.id);

    const supabaseAdmin = createSupabaseAdminClient();
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteAuthError) throw deleteAuthError;

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;

    return { success: true };
  } catch (err) {
    logServerError("deleteAccount failed", err);
    return { error: "Unable to delete your account. Please try again." };
  }
}
