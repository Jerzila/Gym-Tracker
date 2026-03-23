"use client";

import { useState } from "react";
import { runRestorePurchasesCheck } from "@/app/lib/purchases/restorePurchases";
import { useNetworkStatus } from "@/app/components/NetworkStatusProvider";

export function RestorePurchasesRow() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [hadError, setHadError] = useState(false);
  const { isOnline, requireOnline } = useNetworkStatus();

  async function handleRestorePurchases() {
    if (isChecking) return;
    if (!requireOnline()) return;

    setIsChecking(true);
    try {
      const result = await runRestorePurchasesCheck();
      setHadError(false);
      setModalMessage(result.message);
      setIsModalOpen(true);
    } catch (err) {
      console.error("[purchases] restore failed", err);
      setHadError(true);
      setModalMessage("Unable to restore purchases. Please try again.");
      setIsModalOpen(true);
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleRestorePurchases}
        disabled={isChecking || !isOnline}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-4 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900/60 tap-feedback disabled:cursor-not-allowed disabled:opacity-70"
      >
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-zinc-100">Restore Purchases</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {isChecking ? "Checking purchases..." : "Restore existing App Store purchases"}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-zinc-500">{isChecking ? "Loading..." : ">"}</span>
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-purchases-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
            <h2 id="restore-purchases-title" className="text-lg font-semibold text-zinc-100">
              Restore Purchases
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{modalMessage}</p>
            {hadError && (
              <button
                type="button"
                onClick={handleRestorePurchases}
                disabled={isChecking || !isOnline}
                className="mt-5 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-700 disabled:opacity-60"
              >
                {isChecking ? "Retrying..." : "Retry"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="mt-2 w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
