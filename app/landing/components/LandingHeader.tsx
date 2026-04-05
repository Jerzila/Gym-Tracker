"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { LandingMobileMenu } from "./LandingMobileMenu";

const nav = [
  { href: "#previews", label: "Product" },
  { href: "#progress", label: "Progress" },
  { href: "#features", label: "Features" },
  { href: "#insights", label: "Insights" },
  { href: "#pro", label: "Pro" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`landing-header fixed inset-x-0 top-0 z-50 transition-[background,box-shadow,border-color] duration-500 ${
        scrolled
          ? "border-b border-white/[0.08] bg-zinc-950/75 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[3.75rem] min-w-0 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-5 md:px-8">
        <a
          href="#top"
          className="relative flex shrink-0 items-center"
          aria-label="Liftly, back to top"
        >
          <Image
            src="/landing/liftly-logo.png"
            alt=""
            width={859}
            height={1024}
            className="h-9 w-auto object-contain object-left sm:h-10"
            priority
          />
        </a>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Page sections">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-zinc-400 transition-colors duration-200 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex min-w-0 shrink-0 items-center gap-2 md:gap-3">
          <a
            href="#download"
            className="shrink-0 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-2 text-[11px] font-medium leading-none text-zinc-100 transition-all duration-200 hover:border-amber-400/30 hover:bg-white/[0.1] sm:px-3 sm:text-xs md:px-4 md:text-sm"
          >
            Get the app
          </a>
          <LandingMobileMenu />
        </div>
      </div>
    </header>
  );
}
