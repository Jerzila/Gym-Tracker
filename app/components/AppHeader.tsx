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
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-start">{leftSlot ?? <span aria-hidden />}</div>
        <h1 className="min-w-0 flex-1 truncate text-center text-lg font-semibold tracking-tight text-zinc-100">
          {title}
        </h1>
        <div className="flex h-10 w-10 shrink-0 items-center justify-end">{rightSlot ?? <span aria-hidden />}</div>
      </div>
    </header>
  );
}
