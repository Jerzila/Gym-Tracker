"use server";

import { headers } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { APP_HOME, appHref, normalizeAuthRedirect } from "@/lib/appRoutes";
import { redirect } from "next/navigation";

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

    if (user && !user.email_confirmed_at) {
      try {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });
        if (otpError) {
          console.error("[auth] signUp OTP send failed", otpError);
        }
      } catch (otpErr) {
        console.error("[auth] signUp OTP send threw", otpErr);
      }

      redirect(
        `${appHref("/verify-email")}?email=${encodeURIComponent(email)}&next=${encodeURIComponent(appHref("/profile-setup"))}`
      );
    }
  } catch (err) {
    logServerError("signUp failed", err);
    return { error: "Unable to create account. Please try again." };
  }

  redirect(appHref("/profile-setup"));
}

export async function signIn(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirect") as string)?.trim() || APP_HOME;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;

    if (user && !user.email_confirmed_at) {
      try {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });
        if (otpError) {
          console.error("[auth] signIn OTP send failed", otpError);
        }
      } catch (otpErr) {
        console.error("[auth] signIn OTP send threw", otpErr);
      }

      redirect(
        `${appHref("/verify-email")}?email=${encodeURIComponent(email)}&next=${encodeURIComponent(
          normalizeAuthRedirect(redirectTo.startsWith("/") ? redirectTo : APP_HOME)
        )}`
      );
    }
  } catch (err) {
    const msg =
      typeof err === "object" && err && "message" in err ? String((err as { message?: unknown }).message) : "";
    if (/email\s+not\s+confirmed/i.test(msg)) {
      try {
        const supabase = await createServerClient();
        await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });
      } catch (otpErr) {
        console.error("[auth] signIn OTP send after unconfirmed error threw", otpErr);
      }

      redirect(
        `${appHref("/verify-email")}?email=${encodeURIComponent(email)}&next=${encodeURIComponent(
          normalizeAuthRedirect(redirectTo.startsWith("/") ? redirectTo : APP_HOME)
        )}`
      );
    }

    logServerError("signIn failed", err);
    return { error: "Unable to sign in. Please check your email and password." };
  }

  redirect(normalizeAuthRedirect(redirectTo.startsWith("/") ? redirectTo : APP_HOME));
}

export async function signOut() {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (err) {
    logServerError("signOut failed", err);
  }
  redirect(appHref("/login"));
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
      redirectTo: origin ? `${origin}/app/reset-password` : undefined,
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
      redirectTo: origin ? `${origin}/app/reset-password` : undefined,
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

function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim() ?? "";
}

/**
 * Fallback when `SUPABASE_SERVICE_ROLE_KEY` is not set: account removal via `delete-user` Edge Function.
 * Requires deploy: `supabase functions deploy delete-user`
 */
async function invokeDeleteUserEdgeFunction(accessToken: string): Promise<{ error?: string }> {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const baseUrl = typeof rawUrl === "string" ? rawUrl.trim().replace(/\/$/, "") : "";
  const anonKey = getSupabaseAnonKey();

  if (!baseUrl || !anonKey) {
    return { error: "Account deletion is not configured. Please try again later." };
  }

  const fnUrl = `${baseUrl}/functions/v1/delete-user`;
  let res: Response;
  try {
    res = await fetch(fnUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
    });
  } catch (err) {
    logServerError("invokeDeleteUserEdgeFunction fetch failed", err);
    return { error: "Unable to reach account deletion service. Please try again." };
  }

  const body = (await res.json().catch(() => ({}))) as { error?: string; success?: boolean };
  if (!res.ok || !body.success) {
    return { error: body.error ?? "Unable to delete your account. Please try again." };
  }

  return {};
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

    const { data: signInData, error: passwordError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (passwordError) {
      return { error: "Incorrect password. Please try again." };
    }

    const accessToken = signInData.session?.access_token;
    if (!accessToken) {
      return { error: "Unable to verify your session for account deletion." };
    }

    // Always use the edge function deletion flow so data is purged in a safe order
    // before auth user removal (prevents FK ordering failures on direct auth deletion).
    const fnResult = await invokeDeleteUserEdgeFunction(accessToken);
    if (fnResult.error) {
      return { error: fnResult.error };
    }

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) logServerError("deleteAccount signOut after edge delete", signOutError);
    } catch (signOutErr) {
      logServerError("deleteAccount signOut threw after edge delete", signOutErr);
    }

    return { success: true };
  } catch (err) {
    logServerError("deleteAccount failed", err);
    return { error: "Unable to delete your account. Please try again." };
  }
}
