"use client";

/**
 * Skeleton loaders for charts, cards, and lists.
 * Use instead of spinners to improve perceived performance and avoid blank screens.
 */

const skeletonBase = "animate-skeleton-pulse rounded bg-zinc-700/60";

export function SkeletonChart({ className = "h-72" }: { className?: string }) {
  return (
    <div
      className={`w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 ${className}`}
      aria-hidden
    >
      <div className={`${skeletonBase} mb-4 h-4 w-24`} />
      <div className="flex h-[calc(100%-2rem)] items-end gap-1">
        {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
          <div
            key={i}
            className={`${skeletonBase} flex-1 min-w-2`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 ${className}`}
      aria-hidden
    >
      <div className={`${skeletonBase} mb-2 h-3 w-16`} />
      <div className={`${skeletonBase} h-6 w-20`} />
      <div className={`${skeletonBase} mt-2 h-3 w-24`} />
    </div>
  );
}

/** Grid of stat cards (e.g. Weekly Progress: Workouts, Volume, Sets, PRs) */
export function SkeletonStatsGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Full-width panel that mimics insights sections (training score, radar, heatmap). */
export function SkeletonPanel({ height = "h-72" }: { height?: string }) {
  return (
    <div
      className={`w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 ${height}`}
      aria-hidden
    >
      <div className={`${skeletonBase} mb-3 h-3 w-32`} />
      <div className={`${skeletonBase} mx-auto mt-8 h-40 w-40 rounded-full`} />
      <div className="mt-4 flex justify-center gap-4">
        <div className={`${skeletonBase} h-3 w-16`} />
        <div className={`${skeletonBase} h-3 w-16`} />
      </div>
    </div>
  );
}

/** List of lines (e.g. exercise list, insights list). */
export function SkeletonList({ lines = 5 }: { lines?: number }) {
  return (
    <ul className="space-y-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-4">
      {Array.from({ length: lines }).map((_, i) => (
        <li key={i} className="flex items-center gap-2.5">
          <div className={`${skeletonBase} h-4 w-4 shrink-0 rounded`} />
          <div className={`${skeletonBase} h-4 flex-1`} style={{ maxWidth: `${80 - i * 5}%` }} />
        </li>
      ))}
    </ul>
  );
}

/** Exercises page: header + button row + list. */
export function SkeletonExercisesPage() {
  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-6 sm:px-6">
      <div className={`${skeletonBase} mb-3 h-3 w-24`} />
      <div className="mb-6 flex gap-3">
        <div className={`${skeletonBase} h-10 w-32 rounded-lg`} />
        <div className={`${skeletonBase} h-10 w-36 rounded-lg`} />
      </div>
      <div className="border-t border-zinc-800/60 pt-6" aria-hidden />
      <ul className="mt-6 space-y-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <li key={i} className="flex h-14 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4">
            <div className={`${skeletonBase} h-4 flex-1`} style={{ maxWidth: `${70 - i * 3}%` }} />
            <div className={`${skeletonBase} h-3 w-12`} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Insights page: full-page skeleton (training score + weekly + heatmap + radar placeholders). */
export function SkeletonInsightsPage() {
  return (
    <div className="space-y-10">
      <section>
        <div className={`${skeletonBase} mb-3 h-3 w-28`} />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4">
          <div className={`${skeletonBase} h-9 w-24`} />
          <div className="mt-3 flex gap-4">
            <div className={`${skeletonBase} h-4 w-20`} />
            <div className={`${skeletonBase} h-4 w-20`} />
            <div className={`${skeletonBase} h-4 w-20`} />
          </div>
        </div>
      </section>

      <section>
        <div className={`${skeletonBase} mb-1 h-3 w-28`} />
        <div className={`${skeletonBase} mb-3 h-3 w-64`} />
        <SkeletonStatsGrid count={4} />
      </section>

      <div className="border-t border-zinc-800/60 pt-8" aria-hidden />

      <section>
        <div className={`${skeletonBase} mb-1 h-3 w-36`} />
        <div className={`${skeletonBase} mb-3 h-3 w-72`} />
        <div className="mb-3 flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`${skeletonBase} h-8 w-20`} />
          ))}
        </div>
        <SkeletonPanel height="h-72" />
      </section>

      <div className="border-t border-zinc-800/60 pt-8" aria-hidden />

      <section>
        <div className={`${skeletonBase} mb-1 h-3 w-28`} />
        <div className={`${skeletonBase} mb-3 h-3 w-48`} />
        <div className="mb-3 flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`${skeletonBase} h-8 w-20`} />
          ))}
        </div>
        <SkeletonPanel height="h-72" />
      </section>
    </div>
  );
}

/** Dashboard-style skeleton: CTA + cards + chart placeholders. */
export function SkeletonDashboard() {
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 pb-24 pt-6 sm:px-6">
      <div className={`${skeletonBase} h-14 w-full rounded-xl`} />
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className={`${skeletonBase} mb-1 h-3 w-28`} />
        <div className={`${skeletonBase} mt-1 h-8 w-24`} />
        <div className={`${skeletonBase} mt-2 h-4 w-36`} />
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className={`${skeletonBase} mb-2 h-3 w-20`} />
        <div className={`${skeletonBase} h-8 w-20`} />
        <div className={`${skeletonBase} mt-3 h-14 w-full rounded-lg`} />
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className={`${skeletonBase} mb-1 h-3 w-24`} />
        <div className={`${skeletonBase} mt-1 h-6 w-40`} />
        <div className={`${skeletonBase} mt-1 h-3 w-24`} />
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className={`${skeletonBase} mb-3 h-3 w-28`} />
        <div className={`${skeletonBase} h-32 w-full rounded-lg`} />
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className={`${skeletonBase} mb-3 h-3 w-32`} />
        <div className={`${skeletonBase} h-40 w-full rounded-lg`} />
      </div>
    </div>
  );
}

/** Calendar grid skeleton (weekday headers + day cells). */
export function SkeletonCalendarGrid() {
  const WEEKDAYS = 7;
  const ROWS = 5;
  return (
    <div className="grid grid-cols-7 gap-px border-t border-zinc-800/60 bg-zinc-800/40 p-2">
      {Array.from({ length: WEEKDAYS }).map((_, i) => (
        <div
          key={`h-${i}`}
          className={`${skeletonBase} py-2 text-center h-4`}
        />
      ))}
      {Array.from({ length: WEEKDAYS * ROWS }).map((_, i) => (
        <div
          key={i}
          className={`${skeletonBase} min-h-[4rem] rounded-lg`}
        />
      ))}
    </div>
  );
}
