"use client";

import { useEffect, useState } from "react";
import { getWeeklyStats, type WeeklyStats } from "@/app/actions/weeklyStats";
import { BoltIcon } from "@/components/icons";

function formatVolume(volume: number): string {
  return Math.round(volume).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function ThisWeekSection() {
  const [stats, setStats] = useState<WeeklyStats | null | undefined>(undefined);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    getWeeklyStats(tz).then(setStats);
  }, []);

  if (stats === undefined) {
    return <p className="mt-2 text-sm text-zinc-500">Loading…</p>;
  }

  if (stats === null) {
    return null;
  }

  const hasWorkouts = stats.workoutCount > 0;

  return (
    <div className="mt-2 space-y-0.5" aria-label="This week summary">
      {hasWorkouts ? (
        <>
          <p className="text-sm text-zinc-400">
            {stats.workoutCount} workout{stats.workoutCount !== 1 ? "s" : ""} • {stats.setCount} set
            {stats.setCount !== 1 ? "s" : ""} • {formatVolume(stats.volume)}kg volume
          </p>
          {stats.prCount > 0 && (
            <p className="flex items-center gap-1.5 text-sm text-amber-400/90">
              <BoltIcon size={16} aria-hidden className="shrink-0" />
              <span>
                {stats.prCount} PR{stats.prCount !== 1 ? "s" : ""} hit
              </span>
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-zinc-500">No workouts logged this week yet.</p>
      )}
    </div>
  );
}
