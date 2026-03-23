"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "@/app/components/Button";

type AuthFormProps = {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  submitLabel: string;
  redirectTo?: string;
  requireLegalAgreement?: boolean;
};

function SubmitButton({
  submitLabel,
  disabled,
}: {
  submitLabel: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isSignUp = /sign up|create account/i.test(submitLabel);
  const loadingLabel = isSignUp ? "Creating account…" : "Signing in…";
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={`${buttonClass.primary} w-full disabled:opacity-70 disabled:pointer-events-none`}
    >
      {pending ? loadingLabel : submitLabel}
    </button>
  );
}

export function AuthForm({ action, submitLabel, redirectTo, requireLegalAgreement }: AuthFormProps) {
  const isSignUp = /sign up|create account/i.test(submitLabel);
  const [state, formAction] = useActionState(
    async (_: unknown, formData: FormData) => {
      return action(formData);
    },
    null as { error?: string } | null
  );
  const [agreedToLegal, setAgreedToLegal] = useState(false);
  const [legalError, setLegalError] = useState<string | null>(null);
  const shouldRequireLegalAgreement = Boolean(requireLegalAgreement);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!shouldRequireLegalAgreement) return;
    if (agreedToLegal) {
      setLegalError(null);
      return;
    }

    event.preventDefault();
    setLegalError("You must agree to the Terms of Service and Privacy Policy to continue.");
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-3">
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
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          placeholder="••••••••"
        />
        {isSignUp && (
          <p className="mt-1 text-xs text-zinc-500">At least 6 characters</p>
        )}
      </div>
      {shouldRequireLegalAgreement && (
        <div className="space-y-1.5">
          <label
            htmlFor="legalAgreement"
            className="flex items-start gap-2.5 rounded-lg border border-zinc-800/80 bg-zinc-900/20 p-2.5"
          >
            <input
              id="legalAgreement"
              name="legalAgreement"
              type="checkbox"
              checked={agreedToLegal}
              onChange={(event) => {
                setAgreedToLegal(event.target.checked);
                if (event.target.checked) setLegalError(null);
              }}
              className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-amber-500"
            />
            <span className="text-xs leading-relaxed text-zinc-400">
              By creating an account you agree to Liftly&apos;s{" "}
              <Link href="/terms" className="font-medium text-amber-500/90 hover:text-amber-400 underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-amber-500/90 hover:text-amber-400 underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {legalError && (
            <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
              {legalError}
            </p>
          )}
        </div>
      )}
      {state?.error && (
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <SubmitButton submitLabel={submitLabel} disabled={shouldRequireLegalAgreement && !agreedToLegal} />
    </form>
  );
}
