"use client";

import { useState, useTransition } from "react";
import { sendPasswordResetForSessionUser } from "@/app/actions/auth";
import { Button } from "@/app/components/Button";

export function SettingsPasswordReset() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onReset() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await sendPasswordResetForSessionUser();
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage("Check your email for a link to reset your password.");
    });
  }

  return (
    <div>
      <p className="text-sm font-medium text-zinc-100">Reset password</p>
      <p className="mt-1 text-xs text-zinc-500">
        We&apos;ll email you a secure link. Your address is never shown here.
      </p>
      <Button type="button" variant="secondary" className="mt-3" disabled={pending} onClick={onReset}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      {message && <p className="mt-3 text-sm text-amber-400/90">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </div>
  );
}
