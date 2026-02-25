"use client";

import { useActionState } from "react";

type AuthFormProps = {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  submitLabel: string;
  redirectTo?: string;
};

export function AuthForm({ action, submitLabel, redirectTo }: AuthFormProps) {
  const [state, formAction] = useActionState(
    async (_: unknown, formData: FormData) => {
      return action(formData);
    },
    null as { error?: string } | null
  );

  return (
    <form action={formAction} className="space-y-4">
      {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-400 mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={submitLabel === "Sign up" ? "new-password" : "current-password"}
          required
          minLength={6}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          placeholder="••••••••"
        />
        {submitLabel === "Sign up" && (
          <p className="mt-1 text-xs text-zinc-500">At least 6 characters</p>
        )}
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        className="w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-zinc-950 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950 transition"
      >
        {submitLabel}
      </button>
    </form>
  );
}
