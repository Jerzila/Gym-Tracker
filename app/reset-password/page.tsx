"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { buttonClass } from "@/app/components/Button";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  // Create once per page instance.
  const supabase = useMemo(() => createClient(), []);

  const [ready, setReady] = useState(false);
  const [sessionExists, setSessionExists] = useState(false);
  const [hasRecoveryCode, setHasRecoveryCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    let mounted = true;

    const hasCode = new URLSearchParams(window.location.search).get("code");
    setHasRecoveryCode(!!hasCode);

    // For PKCE recovery links (`?code=...&type=recovery`), Supabase should
    // detect and exchange the code into a session when we call getSession().
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSessionExists(!!data.session);
        setReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setSessionExists(false);
        setReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const nextPassword = password.trim();
    const nextConfirm = confirm.trim();

    if (!nextPassword || !nextConfirm) {
      setFormError("Password and confirmation are required.");
      return;
    }
    if (nextPassword.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    if (nextPassword !== nextConfirm) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      // Re-check just before update; this gives Supabase time to exchange
      // the recovery code into a usable session.
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        setSessionExists(false);
        setFormError("Auth session missing! Please open the reset link again.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: nextPassword });
      if (error) {
        setFormError(error.message);
        return;
      }

      router.push("/login?message=password-updated");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm text-center">
          <p className="text-zinc-500">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="w-full space-y-8">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide text-amber-500/90 uppercase">
              Liftly
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              Set new password
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {!sessionExists && (
              <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {hasRecoveryCode
                  ? "Your reset session isn’t ready yet. Try submitting again in a moment."
                  : "This reset link may have expired. Open it again from your email."}
              </p>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-400 mb-1"
              >
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-zinc-500">
                At least 6 characters
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="block text-sm font-medium text-zinc-400 mb-1"
              >
                Confirm password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="••••••••"
              />
            </div>

            {formError && (
              <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className={`${buttonClass.primary} w-full disabled:opacity-70 disabled:pointer-events-none`}
            >
              {submitting ? "Updating…" : "Update password"}
            </button>
          </form>

          <p className="text-center text-sm text-zinc-500">
            <Link
              href="/login"
              className="text-amber-500 hover:text-amber-400 transition"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
