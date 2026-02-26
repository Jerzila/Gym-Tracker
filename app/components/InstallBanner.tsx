"use client";

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "gym-tracker-install-banner-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as { standalone?: boolean };
  if (nav.standalone === true) return true;
  try {
    return window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

export type DeviceType =
  | "ios-safari"
  | "ios-chrome"
  | "android-chrome"
  | "desktop-chrome"
  | "desktop-safari"
  | "unknown";

function getDeviceType(): DeviceType {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const isIPad = /iPad/.test(ua);
  const isIPhone = /iPhone|iPod/.test(ua);
  const isIOSDevice = isIPad || isIPhone || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edge|Edg/.test(ua);
  const isCriOS = /CriOS/.test(ua); // Chrome on iOS
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS/.test(ua);
  const isMac = /Mac/.test(navigator.platform);

  if (isIOSDevice && isCriOS) return "ios-chrome";
  if (isIOSDevice && isSafari) return "ios-safari";
  if (isIOSDevice) return "ios-safari"; // other iOS browsers → show Safari instructions
  if (isAndroid && isChrome) return "android-chrome";
  if (isMac && isSafari) return "desktop-safari";
  if (isChrome) return "desktop-chrome";
  return "unknown";
}

function Step({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm text-zinc-300">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-200">
        {num}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200/90">
      {children}
    </div>
  );
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [device, setDevice] = useState<DeviceType>("unknown");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installResult, setInstallResult] = useState<"pending" | "success" | "dismissed" | null>(null);

  const checkAndShow = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY) === "true";
      if (dismissed || isStandalone()) {
        setVisible(false);
        return;
      }
      setVisible(true);
    } catch {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setDevice(getDeviceType());

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    checkAndShow();
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, [mounted, checkAndShow]);

  const handleDismiss = useCallback(() => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setVisible(false);
    setModalOpen(false);
  }, []);

  const handleHowToInstall = useCallback(() => {
    setModalOpen(true);
  }, []);

  const handleAndroidInstallPrompt = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      const { outcome } = await deferredPrompt.prompt();
      setInstallResult(outcome === "accepted" ? "success" : "dismissed");
      setDeferredPrompt(null);
    } catch {
      setInstallResult("dismissed");
    }
  }, [deferredPrompt]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setInstallResult(null);
  }, []);

  if (!mounted || !visible) return null;

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 animate-slide-up"
        role="banner"
        aria-label="Install app suggestion"
      >
        <div className="mx-auto max-w-lg rounded-2xl bg-zinc-900 border border-zinc-700 shadow-lg shadow-black/30 px-4 py-3.5 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-100">Install Gym Tracker</h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              Add this app to your home screen for faster access.
            </p>
            <button
              type="button"
              onClick={handleHowToInstall}
              className="mt-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-amber-400 transition"
            >
              How to Install
            </button>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 animate-fade-in"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-modal-title"
        >
          <div
            className="w-full max-w-sm max-h-[85vh] rounded-t-2xl sm:rounded-2xl bg-zinc-900 border border-zinc-700 shadow-xl flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between shrink-0 p-5 pb-2">
              <h2 id="install-modal-title" className="text-lg font-semibold text-zinc-100">
                {installResult === "success"
                  ? "Done"
                  : device === "ios-chrome"
                    ? "Install on iPhone (Chrome)"
                    : device === "ios-safari"
                      ? "Install on iPhone (Safari)"
                      : device === "android-chrome"
                        ? "Install on Android"
                        : device === "desktop-chrome"
                          ? "Install on Desktop"
                          : device === "desktop-safari"
                            ? "Install on Mac"
                            : "How to Install"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain px-5 pb-5 flex-1 min-h-0">
              {installResult === "success" ? (
                <p className="text-sm text-zinc-400">App added. You can close this and open from your home screen.</p>
              ) : (
                <InstallInstructions
                  device={device}
                  installResult={installResult}
                  deferredPrompt={deferredPrompt}
                  onInstallPrompt={async () => {
                    if (deferredPrompt) {
                      const { outcome } = await deferredPrompt.prompt();
                      setInstallResult(outcome === "accepted" ? "success" : "dismissed");
                    }
                  }}
                />
              )}
            </div>

            <div className="shrink-0 p-5 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={closeModal}
                className="w-full rounded-lg bg-zinc-800 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type InstallInstructionsProps = {
  device: DeviceType;
  installResult: "pending" | "success" | "dismissed" | null;
  deferredPrompt: BeforeInstallPromptEvent | null;
  onInstallPrompt: () => Promise<void>;
};

function InstallInstructions({ device, installResult, deferredPrompt, onInstallPrompt }: InstallInstructionsProps) {
  // Chrome on iOS: install via Chrome share menu
  if (device === "ios-chrome") {
    return (
      <div className="space-y-4">
        <ol className="space-y-3">
          <Step num={1}>Tap the Share icon in Chrome (located in the address bar at the top right).</Step>
          <Step num={2}>Scroll down in the share menu.</Step>
          <Step num={3}>Tap &quot;Add to Home Screen&quot;.</Step>
          <Step num={4}>Tap &quot;Add&quot; in the top right corner.</Step>
        </ol>
        <p className="text-xs text-zinc-500">
          If you don&apos;t see &quot;Add to Home Screen&quot;, tap &quot;More&quot; in the share sheet and enable it.
        </p>
      </div>
    );
  }

  // iOS Safari
  if (device === "ios-safari") {
    return (
      <div className="space-y-4">
        <ol className="space-y-3">
          <Step num={1}>Tap the Share icon (square with arrow) at the bottom of Safari.</Step>
          <Step num={2}>Scroll down.</Step>
          <Step num={3}>Tap &quot;Add to Home Screen&quot;.</Step>
          <Step num={4}>Tap &quot;Add&quot;.</Step>
        </ol>
      </div>
    );
  }

  // Android Chrome: native prompt or manual steps
  if (device === "android-chrome") {
    if (deferredPrompt && installResult !== "dismissed") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">Tap below to add Gym Tracker to your home screen.</p>
          <button
            type="button"
            onClick={onInstallPrompt}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-medium text-zinc-900 hover:bg-amber-400 transition"
          >
            Install
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <ol className="space-y-3">
          <Step num={1}>Tap the three dots in the top right corner.</Step>
          <Step num={2}>Tap &quot;Install app&quot; or &quot;Add to Home screen&quot;.</Step>
          <Step num={3}>Tap &quot;Install&quot;.</Step>
        </ol>
      </div>
    );
  }

  // Desktop Chrome
  if (device === "desktop-chrome") {
    return (
      <div className="space-y-4">
        <ol className="space-y-3">
          <Step num={1}>Look for the install icon in the right side of the address bar.</Step>
          <Step num={2}>Click it.</Step>
          <Step num={3}>Click &quot;Install&quot;.</Step>
        </ol>
        <p className="text-sm text-zinc-500">
          Alternative: Click the three dots → Install App.
        </p>
      </div>
    );
  }

  // Desktop Safari (Mac)
  if (device === "desktop-safari") {
    return (
      <div className="space-y-4">
        <ol className="space-y-3">
          <Step num={1}>Click Share in Safari toolbar.</Step>
          <Step num={2}>Click &quot;Add to Dock&quot;.</Step>
          <Step num={3}>Confirm installation.</Step>
        </ol>
      </div>
    );
  }

  // Unknown / fallback
  return (
    <p className="text-sm text-zinc-400">
      Use your browser&apos;s menu (e.g. &quot;Install app&quot; or &quot;Add to Home screen&quot;) to install this app.
    </p>
  );
}
