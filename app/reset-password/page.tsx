"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { updatePassword } from "@/app/actions/auth";
import { buttonClass } from "@/app/components/Button";
import { createClient } from "@/lib/supabase/client";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${buttonClass.primary} w-full disabled:opacity-70 disabled:pointer-events-none`}
    >
      {pending ? "Updating…" : "Update password"}
    </button>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_: unknown, formData: FormData) => {
      const result = await updatePassword(formData);
      if (result?.success) {
        router.push("/login?message=password-updated");
      }
      return result;
    },
    null as { error?: string; success?: boolean } | null
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(() => {
      setReady(true);
    });
  }, []);

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
            <p className="text-sm font-semibold tracking-wide text-amber-500/90 uppercase">Liftly</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Set new password</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Enter your new password below.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-400 mb-1">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-zinc-500">At least 6 characters</p>
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-zinc-400 mb-1">
                Confirm password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="••••••••"
              />
            </div>
            {state?.error && (
              <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
                {state.error}
              </p>
            )}
            <SubmitButton />
          </form>

          <p className="text-center text-sm text-zinc-500">
            <Link href="/login" className="text-amber-500 hover:text-amber-400 transition">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
