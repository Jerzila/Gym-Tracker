"use client";

import Link from "next/link";
import { useState } from "react";
import { runRestorePurchasesCheck } from "@/app/lib/purchases/restorePurchases";
import { useNetworkStatus } from "@/app/components/NetworkStatusProvider";
import { useProAccess } from "@/app/components/ProAccessProvider";
import { haptic } from "@/lib/haptic";

type Props = {
  compact?: boolean;
};

export function PaywallLegalFooter({ compact = false }: Props) {
  const { refreshAccess } = useProAccess();
  const { isOnline, requireOnline } = useNetworkStatus();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleRestore() {
    if (checking) return;
    if (!requireOnline()) return;
    haptic();
    setChecking(true);
    try {
      const result = await runRestorePurchasesCheck();
      await refreshAccess();
      setModalMessage(result.message);
      setModalOpen(true);
    } catch {
      setModalMessage("Unable to restore purchases. Please try again.");
      setModalOpen(true);
    } finally {
      setChecking(false);
    }
  }

  const textClass = compact
    ? "text-[10px] leading-snug text-zinc-500 min-[390px]:text-[11px]"
    : "text-[11px] leading-snug text-zinc-500 min-[390px]:text-xs";

  const linkClass =
    "font-medium text-zinc-400 underline underline-offset-2 transition-colors hover:text-zinc-300";

  return (
    <>
      <div className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 ${textClass}`}>
        <Link href="/terms" className={linkClass}>
          Terms of Service
        </Link>
        <span className="text-zinc-600" aria-hidden>
          ·
        </span>
        <Link href="/privacy" className={linkClass}>
          Privacy Policy
        </Link>
        <span className="text-zinc-600" aria-hidden>
          ·
        </span>
        <button
          type="button"
          onClick={() => void handleRestore()}
          disabled={checking || !isOnline}
          className={`${linkClass} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {checking ? "Restoring…" : "Restore purchases"}
        </button>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="paywall-restore-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
            <h2 id="paywall-restore-title" className="text-lg font-semibold text-zinc-100">
              Restore purchases
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{modalMessage}</p>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="mt-5 w-full rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90 tap-feedback"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
