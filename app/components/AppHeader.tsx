"use client";

import type { ReactNode } from "react";

export function AppHeader({
  title,
  leftSlot,
  rightSlot,
}: {
  title: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
}) {
  return (
    <header
      className="relative mx-auto flex h-14 w-full max-w-3xl items-center justify-center border-b border-white/[0.05] bg-zinc-950 px-4"
      role="banner"
    >
      {leftSlot ? <div className="absolute left-4">{leftSlot}</div> : null}

      <h1 className="px-12 text-center text-[22px] font-bold leading-none text-zinc-100">
        {title}
      </h1>

      {rightSlot ? (
        <div className="absolute right-4 flex items-center gap-2.5">{rightSlot}</div>
      ) : null}
    </header>
  );
}
