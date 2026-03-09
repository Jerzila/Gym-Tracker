"use client";

export function AppHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="w-10 shrink-0" aria-hidden />
        <h1 className="min-w-0 flex-1 truncate text-center text-lg font-semibold tracking-tight text-zinc-100">
          {title}
        </h1>
        <div className="w-10 shrink-0" aria-hidden />
      </div>
    </header>
  );
}
