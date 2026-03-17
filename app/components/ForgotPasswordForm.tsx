"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "@/app/components/Button";

type ForgotPasswordFormProps = {
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${buttonClass.primary} w-full disabled:opacity-70 disabled:pointer-events-none`}
    >
      {pending ? "Sending…" : "Send reset link"}
    </button>
  );
}

export function ForgotPasswordForm({ action }: ForgotPasswordFormProps) {
  const [state, formAction] = useActionState(
    async (_: unknown, formData: FormData) => {
      return action(formData);
    },
    null as { error?: string; success?: boolean } | null
  );

  return (
    <form action={formAction} className="space-y-4">
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
      {state?.error && (
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-lg bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
          Check your email for a link to reset your password.
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
