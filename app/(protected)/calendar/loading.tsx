import { SkeletonCalendarGrid } from "@/app/components/Skeleton";

export default function CalendarLoading() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-2xl px-4 py-6 sm:px-6">
      <div className="w-full min-w-0 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
          <div className="animate-skeleton-pulse h-6 w-20 rounded bg-zinc-700/60" />
          <div className="animate-skeleton-pulse h-6 w-24 rounded bg-zinc-700/60" />
          <div className="animate-skeleton-pulse h-6 w-20 rounded bg-zinc-700/60" />
        </div>
        <SkeletonCalendarGrid />
      </div>
    </main>
  );
}
