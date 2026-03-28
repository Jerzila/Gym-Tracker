"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  canShowInstallPrompt,
  isAppInstalled,
  isIOS,
  markInstallPromptShown,
  markPwaInstalled,
} from "@/lib/pwaInstall";
import { buttonClass } from "@/app/components/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const REQUEST_INSTALL_EVENT = "liftly-request-install-prompt";

export function InstallPromptModal() {
  const [open, setOpen] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setShowIOSInstructions(false);
    setInstalling(false);
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  useEffect(() => {
    const handleRequest = () => {
      if (isAppInstalled()) return;
      if (!canShowInstallPrompt()) return;
      markInstallPromptShown();
      const hasNativePrompt = deferredPromptRef.current != null;
      if (isIOS() && !hasNativePrompt) {
        setShowIOSInstructions(true);
      }
      setOpen(true);
    };
    window.addEventListener(REQUEST_INSTALL_EVENT, handleRequest);
    return () => window.removeEventListener(REQUEST_INSTALL_EVENT, handleRequest);
  }, []);

  const handleAddToHomeScreen = useCallback(async () => {
    const deferred = deferredPromptRef.current;
    if (deferred) {
      setInstalling(true);
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") {
          markPwaInstalled();
          deferredPromptRef.current = null;
          close();
        }
      } finally {
        setInstalling(false);
      }
    } else {
      close();
    }
  }, [close]);

  const handleNotNow = useCallback(() => {
    close();
  }, [close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-prompt-title"
      aria-describedby="install-prompt-desc"
    >
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        aria-hidden="true"
        onClick={handleNotNow}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        <h2
          id="install-prompt-title"
          className="text-lg font-semibold tracking-tight text-zinc-100"
        >
          Install Liftly
        </h2>
        <p
          id="install-prompt-desc"
          className="mt-2 text-sm text-zinc-400"
        >
          Add Liftly to your Home Screen for faster access and to track your
          strength progress instantly.
        </p>
        {showIOSInstructions && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Tap the Share button and select &quot;Add to Home Screen&quot;
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse sm:gap-3">
          {!showIOSInstructions && (
            <button
              type="button"
              onClick={handleAddToHomeScreen}
              disabled={installing}
              className={buttonClass.primary}
            >
              {installing ? "Opening…" : "Add to Home Screen"}
            </button>
          )}
          <button
            type="button"
            onClick={handleNotNow}
            className={buttonClass.ghost}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
