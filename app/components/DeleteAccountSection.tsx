"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount } from "@/app/actions/auth";
import { useNetworkStatus } from "@/app/components/NetworkStatusProvider";

export function DeleteAccountSection() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const { isOnline, requireOnline } = useNetworkStatus();
  const [state, formAction, isPending] = useActionState(
    async (_: { error?: string; success?: boolean } | null, formData: FormData) => {
      return deleteAccount(formData);
    },
    null as { error?: string; success?: boolean } | null
  );

  useEffect(() => {
    if (!state?.success) return;
    const timeout = setTimeout(() => {
      router.replace("/login");
    }, 1400);
    return () => clearTimeout(timeout);
  }, [router, state?.success]);

  return (
    <section className="pt-4">
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Account Management
      </p>
      <button
        type="button"
        onClick={() => {
          if (!requireOnline()) return;
          setIsModalOpen(true);
        }}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-4 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900/60 tap-feedback"
      >
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-zinc-100">Delete Account</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">Permanently remove your account and data</p>
        </div>
        <span className="shrink-0 text-lg text-zinc-500" aria-hidden>
          ›
        </span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-zinc-100">Delete Account</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              This will permanently delete your Liftly account and all associated data including workouts, body
              metrics, and rankings. This action cannot be undone.
            </p>

            <form
              action={formAction}
              onSubmit={(event) => {
                if (!requireOnline()) {
                  event.preventDefault();
                }
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label htmlFor="delete-account-password" className="mb-1 block text-sm font-medium text-zinc-400">
                  Enter your password to confirm account deletion.
                </label>
                <input
                  id="delete-account-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  disabled={!isOnline}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
                  placeholder="••••••••"
                />
              </div>

              {state?.error && <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{state.error}</p>}
              {state?.error && (
                <button
                  type="submit"
                  disabled={isPending || !password.trim() || !isOnline}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Retrying..." : "Retry"}
                </button>
              )}
              {state?.success && (
                <p className="rounded-lg bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
                  Account deleted successfully. Redirecting to login...
                </p>
              )}

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isPending) return;
                    setIsModalOpen(false);
                    setPassword("");
                  }}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !password.trim() || !isOnline}
                  aria-busy={isPending}
                  className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Deleting..." : !isOnline ? "Offline" : "Delete Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
