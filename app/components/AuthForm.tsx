"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useRef } from "react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "@/app/components/Button";
import { useNetworkStatus } from "@/app/components/NetworkStatusProvider";

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
  const { isOnline } = useNetworkStatus();
  const isSignUp = /sign up|create(?:\s+\w+)?\s+account/i.test(submitLabel);
  const isSignIn = /sign in|log in|login/i.test(submitLabel);
  const loadingLabel = isSignUp ? "Creating account…" : "Signing in…";
  return (
    <button
      type="submit"
      disabled={pending || disabled || !isOnline}
      aria-busy={pending}
      className={`${buttonClass.primary} w-full disabled:opacity-70 disabled:pointer-events-none ${
        isSignUp
          ? "shadow-[0_0_20px_rgba(255,170,0,0.35),0_10px_25px_rgba(0,0,0,0.45)] transition-all duration-200 hover:brightness-105 hover:shadow-[0_0_24px_rgba(255,170,0,0.4),0_12px_28px_rgba(0,0,0,0.5)]"
          : isSignIn
            ? "shadow-[0_0_20px_rgba(255,170,0,0.35),0_10px_25px_rgba(0,0,0,0.45)] transition-all duration-200 hover:brightness-105 hover:shadow-[0_0_24px_rgba(255,170,0,0.4),0_12px_28px_rgba(0,0,0,0.5)]"
          : ""
      }`}
    >
      {pending ? loadingLabel : !isOnline ? "Offline" : submitLabel}
    </button>
  );
}

function RetryButton({ onRetry, isOnline }: { onRetry: () => void; isOnline: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={pending || !isOnline}
      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Retrying..." : "Retry"}
    </button>
  );
}

export function AuthForm({ action, submitLabel, redirectTo, requireLegalAgreement }: AuthFormProps) {
  const isSignUp = /sign up|create(?:\s+\w+)?\s+account/i.test(submitLabel);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction] = useActionState(
    async (_: unknown, formData: FormData) => {
      return action(formData);
    },
    null as { error?: string } | null
  );
  const [agreedToLegal, setAgreedToLegal] = useState(false);
  const [legalError, setLegalError] = useState<string | null>(null);
  const { requireOnline, isOnline } = useNetworkStatus();
  const shouldRequireLegalAgreement = Boolean(requireLegalAgreement);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!requireOnline()) {
      event.preventDefault();
      return;
    }

    if (!shouldRequireLegalAgreement) return;
    if (agreedToLegal) {
      setLegalError(null);
      return;
    }

    event.preventDefault();
    setLegalError("You must agree to the Terms of Service and Privacy Policy to continue.");
  };

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="space-y-3">
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
          disabled={!isOnline}
          className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[rgba(255,170,0,0.6)] focus:outline-none focus:ring-0"
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
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={6}
          disabled={!isOnline}
          className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[rgba(255,170,0,0.6)] focus:outline-none focus:ring-0"
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
              disabled={!isOnline}
              onChange={(event) => {
                setAgreedToLegal(event.target.checked);
                if (event.target.checked) setLegalError(null);
              }}
              className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-amber-500"
            />
            <span className="text-[11px] leading-relaxed text-[rgba(255,255,255,0.6)]">
              By creating an account you agree to Liftly&apos;s{" "}
              <Link href="/terms" className="font-medium text-amber-500 hover:text-amber-400 underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-amber-500 hover:text-amber-400 underline">
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
        <div className="space-y-2">
          <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{state.error}</p>
          <RetryButton
            isOnline={isOnline}
            onRetry={() => {
              if (!formRef.current || !isOnline) return;
              formRef.current.requestSubmit();
            }}
          />
        </div>
      )}
      <SubmitButton submitLabel={submitLabel} disabled={shouldRequireLegalAgreement && !agreedToLegal} />
    </form>
  );
}
