"use client";

import Link from "next/link";
import type { WeeklyComparison } from "@/app/actions/insights";
import type { LastWorkoutSummary } from "@/app/actions/workouts";

function formatLastWorkoutDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Props = {
  weekly: WeeklyComparison | null;
  lastWorkout?: LastWorkoutSummary | null;
};

/** Compact weekly progress card: Exercises/Sets/PRs + last workout preview + See more. */
export function WeeklyProgressWidget({ weekly, lastWorkout }: Props) {
  const exercises = weekly?.thisWeek.exercises ?? 0;
  const sets = weekly?.thisWeek.sets ?? 0;
  const prs = weekly?.thisWeek.prs ?? 0;
  const isEmptyWeek = exercises === 0 && sets === 0 && prs === 0;

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700">
      <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        Weekly Progress
      </h2>

      <div className="flex flex-1 flex-col space-y-2 leading-tight">
        {/* 3 stats — clean grid to prevent label overlap on mobile */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <span className="text-xs text-zinc-400">Exercises</span>
            <span className="text-lg font-semibold text-zinc-100">{exercises}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-zinc-400">Sets</span>
            <span className="text-lg font-semibold text-zinc-100">{sets}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-zinc-400">PRs</span>
            <span className="text-lg font-semibold text-zinc-100">{prs}</span>
          </div>
        </div>

        {isEmptyWeek && (
          <p className="mt-3 text-center text-[11px] leading-snug text-zinc-500 opacity-70">
            Log your first workout to start tracking your weekly progress.
          </p>
        )}

        {/* Last workout — compact, max 3 exercises */}
        {lastWorkout && lastWorkout.exerciseCount > 0 ? (
          <>
            <div className="border-t border-zinc-800 pt-1.5">
              <p className="text-xs font-medium leading-tight text-zinc-300">
                Last Workout: {lastWorkout.title}
                {lastWorkout.prHit && <span className="text-amber-400"> • PR</span>}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500 leading-tight">
                {formatLastWorkoutDate(lastWorkout.date)}
              </p>
              <div className="mt-1 flex flex-col space-y-0.5 text-xs text-zinc-400 leading-tight">
                {lastWorkout.exerciseNames.slice(0, 3).map((name, i) => (
                  <span key={`${name}-${i}`}>{name}</span>
                ))}
                {lastWorkout.exerciseNames.length > 3 && (
                  <span className="text-zinc-500">
                    +{lastWorkout.exerciseNames.length - 3} more
                  </span>
                )}
              </div>
            </div>
            {!isEmptyWeek && (
              <Link
                href={`/calendar?date=${lastWorkout.date}`}
                prefetch={true}
                className="mt-auto flex justify-end text-xs font-medium text-orange-500 transition hover:text-orange-400"
              >
                See more →
              </Link>
            )}
          </>
        ) : !isEmptyWeek ? (
          <Link
            href="/calendar"
            prefetch={true}
            className="mt-auto flex justify-end text-xs font-medium text-orange-500 transition hover:text-orange-400"
          >
            See more →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
