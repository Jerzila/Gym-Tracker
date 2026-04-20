"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_HOME, normalizeAuthRedirect } from "@/lib/appRoutes";
import { buttonClass } from "@/app/components/Button";
import { VerificationCodeInput } from "@/app/components/VerificationCodeInput";

function normalizeNext(next: string | null): string {
  if (!next) return APP_HOME;
  const n = next.startsWith("/") ? next : APP_HOME;
  return normalizeAuthRedirect(n);
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 px-4 py-6 text-zinc-100">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/20 p-5 text-sm text-zinc-400">
            Loading…
          </div>
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => normalizeNext(searchParams.get("next")), [searchParams]);

  const [email, setEmail] = useState(() => (searchParams.get("email") ?? "").trim());
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: userError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (userError) return;
      const user = data.user;
      if (!user) return;
      if (user.email_confirmed_at) {
        router.replace(nextPath);
        return;
      }
      if (!email && user.email) setEmail(user.email);
    })();
    return () => {
      cancelled = true;
    };
  }, [email, nextPath, router, supabase]);

  const canSubmit = code.replace(/\D/g, "").length === 6 && Boolean(email) && !busy;

  const verify = async () => {
    const trimmedEmail = email.trim();
    const token = code.replace(/\D/g, "");
    if (!trimmedEmail || token.length !== 6) return;

    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token,
        type: "email",
      });
      if (verifyError) throw verifyError;
      router.replace(nextPath);
    } catch {
      setError("Invalid code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { error: resendError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: false },
      });
      if (resendError) throw resendError;
      setInfo("Code sent. Check your email.");
    } catch {
      setError("Unable to resend code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 px-4 py-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-zinc-100">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/20 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide text-amber-500/90 uppercase">Liftly</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Verify your email</h1>
            <p className="mt-2 text-sm text-zinc-400">Enter the 6-digit code sent to your email.</p>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[rgba(255,170,0,0.6)] focus:outline-none focus:ring-0 disabled:opacity-60"
                placeholder="you@example.com"
              />
            </div>

            <VerificationCodeInput value={code} onChange={setCode} disabled={busy} />

            {error && (
              <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300 text-center">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-lg bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300 text-center">
                {info}
              </p>
            )}

            <button
              type="button"
              onClick={verify}
              disabled={!canSubmit}
              className={`${buttonClass.primary} w-full disabled:opacity-70 disabled:pointer-events-none`}
            >
              {busy ? "Verifying…" : "Verify"}
            </button>

            <button
              type="button"
              onClick={resend}
              disabled={!email.trim() || busy}
              className={`${buttonClass.secondary} w-full disabled:opacity-70 disabled:pointer-events-none`}
            >
              {busy ? "Sending…" : "Resend code"}
            </button>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-zinc-500">
          If you don’t see the email, check spam/junk and wait a minute.
        </p>
      </div>
    </div>
  );
}

