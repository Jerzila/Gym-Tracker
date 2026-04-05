"use client";

import { useState } from "react";

function PlaceholderScreen({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-zinc-800 via-zinc-900 to-black px-5 text-center">
      <div className="mb-4 h-[28%] w-[88%] rounded-xl bg-white/[0.06] ring-1 ring-white/[0.08]" />
      <div className="mb-2 h-2.5 w-[72%] rounded-full bg-white/[0.08]" />
      <div className="mb-2 h-2.5 w-[52%] rounded-full bg-white/[0.05]" />
      <div className="mt-4 h-16 w-[88%] rounded-xl bg-white/[0.04]" />
      <p className="mt-6 text-[11px] font-medium tracking-wide text-zinc-500">Screenshot placeholder</p>
      <p className="mt-1 max-w-[90%] text-[10px] leading-snug text-zinc-700">{label}</p>
    </div>
  );
}

export function PhoneMockup({
  src,
  alt,
  className = "",
  priority,
  objectPosition = "50% 50%",
  widthClass = "w-[min(280px,82vw)] sm:w-[300px]",
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  objectPosition?: string;
  widthClass?: string;
}) {
  const [ok, setOk] = useState(true);

  return (
    <div className={`relative flex justify-center ${className}`}>
      <div
        className={`relative ${widthClass} rounded-[2.35rem] border border-white/[0.14] bg-gradient-to-b from-zinc-800/50 to-zinc-950/90 p-[9px] shadow-[0_50px_120px_-30px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-md`}
      >
        <div className="pointer-events-none absolute -inset-px rounded-[2.4rem] bg-gradient-to-b from-amber-400/10 via-transparent to-transparent opacity-60" />
        <div className="relative aspect-[9/19.2] w-full overflow-hidden rounded-[1.9rem] bg-black ring-1 ring-black/60">
          {ok ? (
            // Static <img> so each URL renders as-is (no optimizer); object-contain avoids aggressive crops that made shots look identical.
            // eslint-disable-next-line @next/next/no-img-element -- marketing screenshots; explicit URLs + key={src}
            <img
              key={src}
              src={src}
              alt={alt}
              className="pointer-events-none absolute inset-0 h-full w-full select-none bg-black object-contain object-top"
              style={{ objectPosition }}
              draggable={false}
              decoding="async"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              onError={() => setOk(false)}
            />
          ) : (
            <PlaceholderScreen label={alt} />
          )}
        </div>
      </div>
    </div>
  );
}
