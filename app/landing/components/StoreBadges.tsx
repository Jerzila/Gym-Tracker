"use client";

import Link from "next/link";
import { appHref } from "@/lib/appRoutes";

const APP_STORE_HREF = "https://apps.apple.com/cy/app/liftly-ai-gym-tracker/id6762517196";
const PLAY_STORE_HREF = appHref("/signup");

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

const badgeBase =
  "group flex w-full min-w-0 max-w-full items-center justify-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.06] px-4 py-3.5 text-left shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-300 hover:border-amber-400/25 hover:bg-white/[0.09] hover:shadow-[0_24px_60px_-18px_rgba(245,158,11,0.15)] active:scale-[0.98] sm:inline-flex sm:w-auto sm:max-w-none sm:justify-start sm:px-5";

/** Mobile-first: column + full-width badges; from sm, row/wrap and natural badge width */
const containerClass =
  "mx-auto flex w-full max-w-[min(100%,320px)] flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3";

export function StoreBadges({ layout = "wrap" }: { layout?: "wrap" | "stack" }) {
  const flex =
    layout === "stack"
      ? "mx-auto flex w-full max-w-[min(100%,320px)] flex-col items-stretch justify-center gap-3 sm:max-w-none"
      : containerClass;

  return (
    <div className={flex}>
      <a
        href={APP_STORE_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className={badgeBase}
        aria-label="Download Liftly on the App Store"
      >
        <AppleGlyph className="h-8 w-8 shrink-0 text-white" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Download on the</span>
          <span className="text-[15px] font-semibold tracking-tight text-white">App Store</span>
        </span>
      </a>
      <Link href={PLAY_STORE_HREF} className={badgeBase}>
        <PlayGlyph className="h-7 w-7 shrink-0 text-emerald-400" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Get it on</span>
          <span className="text-[15px] font-semibold tracking-tight text-white">Google Play</span>
        </span>
      </Link>
    </div>
  );
}
