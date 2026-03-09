"use client";

import { useCallback, useEffect, useState } from "react";

type Variant = "auth" | "in-app";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallAppButtonProps = {
  variant?: Variant;
};

function getIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

function getIsIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

const buttonStyles =
  "rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900 transition-colors";

export function InstallAppButton({ variant = "in-app" }: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsStandalone(getIsStandalone());
    setIsIOS(getIsIOS());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    const media = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setIsStandalone(getIsStandalone());
    media.addEventListener("change", onChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      media.removeEventListener("change", onChange);
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  if (isStandalone) return null;

  if (deferredPrompt) {
    const label = variant === "auth" ? "Add to Home Screen" : "Install Liftly";
    return (
      <button type="button" onClick={handleClick} className={buttonStyles}>
        {label}
      </button>
    );
  }

  if (isIOS) {
    return (
      <p className="text-xs text-zinc-500">Tap Share → Add to Home Screen</p>
    );
  }

  return null;
}
