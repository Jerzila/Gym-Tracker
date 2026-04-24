"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useRef } from "react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "@/app/components/Button";
import { useNetworkStatus } from "@/app/components/NetworkStatusProvider";
import { appHref } from "@/lib/appRoutes";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [dismissedServerError, setDismissedServerError] = useState<string | null>(null);
  const { requireOnline, isOnline } = useNetworkStatus();
  const shouldRequireLegalAgreement = Boolean(requireLegalAgreement);
  const showServerError = Boolean(state?.error) && dismissedServerError !== state?.error;
  const errorMessage = state?.error ?? "";
  const errorMessageLower = errorMessage.toLowerCase();
  const isInvalidCredentialsError =
    errorMessageLower.includes("incorrect email or password") ||
    errorMessageLower.includes("invalid login credentials");
  const isRateLimitError =
    errorMessageLower.includes("too many") || errorMessageLower.includes("rate limit");
  const shouldShowRetryButton = (() => {
    if (!errorMessageLower) return false;
    if (isInvalidCredentialsError) return false;
    if (errorMessageLower.includes("email and password are required")) return false;
    if (errorMessageLower.includes("please enter a valid email")) return false;
    if (errorMessageLower.includes("password must be at least")) return false;
    return true;
  })();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    // New attempt: allow server errors from this submit to render again.
    setDismissedServerError(null);

    const nextFieldErrors: { email?: string; password?: string } = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      nextFieldErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextFieldErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextFieldErrors.password = "Password is required.";
    } else if (isSignUp && password.length < 6) {
      nextFieldErrors.password = "Password must be at least 6 characters.";
    }

    if (nextFieldErrors.email || nextFieldErrors.password) {
      event.preventDefault();
      setFieldErrors(nextFieldErrors);
      return;
    }

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
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} noValidate className="space-y-3">
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
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setDismissedServerError(state?.error ?? null);
            if (fieldErrors.email) {
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }
          }}
          disabled={!isOnline}
          aria-invalid={Boolean(fieldErrors.email)}
          className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[rgba(255,170,0,0.6)] focus:outline-none focus:ring-0"
          placeholder="you@example.com"
        />
        {fieldErrors.email ? <p className="mt-1 text-xs text-red-300">{fieldErrors.email}</p> : null}
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
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setDismissedServerError(state?.error ?? null);
            if (fieldErrors.password) {
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }
          }}
          minLength={6}
          disabled={!isOnline}
          aria-invalid={Boolean(fieldErrors.password)}
          className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[rgba(255,170,0,0.6)] focus:outline-none focus:ring-0"
          placeholder="••••••••"
        />
        {fieldErrors.password ? <p className="mt-1 text-xs text-red-300">{fieldErrors.password}</p> : null}
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
      {showServerError && (
        <div className="space-y-2">
          <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{errorMessage}</p>
          {isInvalidCredentialsError && isSignUp === false ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-300">
              If this keeps happening,{" "}
              <Link href={appHref("/forgot-password")} className="font-medium text-amber-400 hover:text-amber-300 underline">
                reset your password
              </Link>
              .
            </div>
          ) : null}
          {isRateLimitError ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-300">
              Too many attempts in a short time. Wait a minute, then try again.
            </div>
          ) : null}
          {shouldShowRetryButton ? (
            <RetryButton
              isOnline={isOnline}
              onRetry={() => {
                if (!formRef.current || !isOnline) return;
                formRef.current.requestSubmit();
              }}
            />
          ) : null}
        </div>
      )}
      <SubmitButton submitLabel={submitLabel} disabled={shouldRequireLegalAgreement && !agreedToLegal} />
    </form>
  );
}
