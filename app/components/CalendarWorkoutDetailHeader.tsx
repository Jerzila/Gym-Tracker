"use client";

import { useRouter } from "next/navigation";

export function CalendarWorkoutDetailHeader() {
  const router = useRouter();

  return (
    <header
      className="sticky top-0 z-50 border-b border-zinc-800/60 bg-[var(--background)]"
      role="banner"
    >
      <div className="relative flex h-14 items-center px-4 sm:px-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-xl text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100"
          aria-label="Back to exercises"
        >
          <span aria-hidden>←</span>
        </button>
        <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold tracking-tight text-zinc-100">
          Exercises
        </h1>
      </div>
    </header>
  );
}
