"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";

const MOBILE_NAV = [
  { href: "#top", label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#blog", label: "Blog" },
  { href: "#support", label: "Support" },
] as const;

const APP_STORE_HREF = "https://apps.apple.com/app";
const PLAY_STORE_HREF = "https://play.google.com/store/apps";

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12 3.84 21.85c-.5-.25-.84-.77-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm-1.06-2.3L15.48 12l.27-.27-8.7-8.7 11.77 6.79c.77.45.77 1.56 0 2.01z" />
    </svg>
  );
}

const storeBadgeClass =
  "flex w-full min-w-0 max-w-full items-center justify-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.06] px-4 py-3.5 text-left shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] transition-colors hover:border-amber-400/25 hover:bg-white/[0.09] active:scale-[0.99] sm:px-5 sm:py-4";

type Stage = "closed" | "open" | "closing";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function LandingMobileMenu() {
  const [stage, setStage] = useState<Stage>("closed");
  const isClient = useIsClient();
  const lastOpenTapRef = useRef(0);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const showLayer = stage !== "closed";
  const panelVisible = stage === "open";

  const handleClose = useCallback(() => {
    setStage((s) => (s === "open" ? "closing" : s));
  }, []);

  const handleOpen = useCallback(() => {
    const now = Date.now();
    if (now - lastOpenTapRef.current < 280) return;
    lastOpenTapRef.current = now;
    setStage((s) => {
      if (s === "open") return s;
      return "open";
    });
  }, []);

  const handleNavClick = () => {
    handleClose();
  };

  const handlePanelTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "transform") return;
    setStage((s) => (s === "closing" ? "closed" : s));
  };

  // Lock scroll only while fully open — not during "closing" — so we never get stuck if transitionend is missed.
  useEffect(() => {
    if (stage !== "open") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== "open") return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, handleClose]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setStage("closed");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <button
        type="button"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-zinc-100 transition-colors hover:border-white/20 hover:bg-white/[0.1] md:hidden"
        aria-label="Open menu"
        aria-expanded={panelVisible}
        aria-controls="landing-mobile-drawer"
        onClick={handleOpen}
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </button>

      {isClient && showLayer
        ? createPortal(
            <div
              className="fixed inset-0 isolate z-[9999] min-h-[100dvh] md:hidden"
              style={{ pointerEvents: panelVisible ? "auto" : "none" }}
              aria-hidden={!panelVisible}
            >
              <button
                type="button"
                className="absolute inset-0 transition-opacity duration-300 ease-out"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.75)",
                  opacity: panelVisible ? 1 : 0,
                }}
                aria-label="Close menu"
                onClick={handleClose}
              />

              <div
                id="landing-mobile-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Site navigation"
                className={`absolute inset-y-0 right-0 flex h-[100dvh] max-h-[100dvh] w-[min(100%,390px)] min-w-0 flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] backface-hidden ${
                  panelVisible ? "translate-x-0" : "translate-x-full"
                }`}
                style={{ backgroundColor: "#050506" }}
                onTransitionEnd={handlePanelTransitionEnd}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-start justify-end px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
                  <button
                    ref={closeBtnRef}
                    type="button"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                    aria-label="Close menu"
                    onClick={handleClose}
                  >
                    <X className="h-6 w-6" strokeWidth={1.5} aria-hidden />
                  </button>
                </div>

                <nav
                  className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-6"
                  aria-label="Mobile"
                >
                  <ul className="flex flex-col gap-0">
                    {MOBILE_NAV.map((item) => (
                      <li key={item.href}>
                        <a
                          href={item.href}
                          className="font-[family-name:var(--font-landing-display)] flex min-h-12 w-full items-center justify-center px-2 py-3.5 text-center text-[1.25rem] font-semibold leading-snug tracking-tight text-white transition-colors hover:text-amber-200/90 min-[390px]:py-4 min-[390px]:text-[1.375rem]"
                          onClick={handleNavClick}
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className="mt-auto flex shrink-0 flex-col items-stretch gap-3 border-t border-white/[0.08] px-4 py-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-5">
                  <a
                    href={APP_STORE_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={storeBadgeClass}
                  >
                    <AppleGlyph className="h-7 w-7 shrink-0 text-white" />
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Download on the</span>
                      <span className="text-[15px] font-semibold tracking-tight text-white">App Store</span>
                    </span>
                  </a>
                  <a
                    href={PLAY_STORE_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={storeBadgeClass}
                  >
                    <PlayGlyph className="h-6 w-6 shrink-0 text-emerald-400" />
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Get it on</span>
                      <span className="text-[15px] font-semibold tracking-tight text-white">Google Play</span>
                    </span>
                  </a>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
