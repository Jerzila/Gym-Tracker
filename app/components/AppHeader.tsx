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
      className="relative mx-auto grid h-14 w-full max-w-3xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-white/[0.05] bg-zinc-950 px-4"
      role="banner"
    >
      <div className="z-10 flex min-w-0 items-center justify-start gap-2">{leftSlot}</div>

      <h1 className="z-0 max-w-[min(20rem,72vw)] truncate text-center text-[18px] font-bold leading-none tracking-tight text-zinc-100 sm:text-[22px]">
        {title}
      </h1>

      <div className="z-10 flex min-w-0 items-center justify-end gap-2">{rightSlot}</div>
    </header>
  );
}
