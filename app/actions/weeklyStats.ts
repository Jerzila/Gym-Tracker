"use server";

import { createServerClient } from "@/lib/supabase/server";
import { computeUserWorkoutAggregatesForUserInDateRange } from "@/lib/computeUserWorkoutAggregates";
import { getWeekBoundsMondaySundayInTimeZone } from "@/lib/weekBoundsTz";

export type WeeklyStats = {
  /** Rows in `workouts` (same as friend profile “Total workouts” semantics, for this week). */
  workoutCount: number;
  setCount: number;
  volume: number;
  prCount: number;
  /** Human range, e.g. "Mar 24 – Mar 30, 2026" */
  weekLabel: string;
  rangeStart: string;
  rangeEnd: string;
};

/**
 * This week’s totals using the same aggregate rules as profile lifetime stats
 * (`computeUserLifetimeWorkoutAggregatesForUser`), scoped to Mon–Sun in the client’s IANA time zone.
 */
export async function getWeeklyStats(timeZone: string): Promise<WeeklyStats | null> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const tz = timeZone?.trim() || "UTC";
    let bounds: { start: string; end: string; labelRange: string };
    try {
      bounds = getWeekBoundsMondaySundayInTimeZone(tz);
    } catch {
      bounds = getWeekBoundsMondaySundayInTimeZone("UTC");
    }

    const { data, error } = await computeUserWorkoutAggregatesForUserInDateRange(
      supabase,
      user.id,
      bounds.start,
      bounds.end
    );
    if (error || !data) return null;

    return {
      workoutCount: data.workoutCount,
      setCount: data.setCount,
      volume: data.totalVolumeKg,
      prCount: data.prCount,
      weekLabel: bounds.labelRange,
      rangeStart: bounds.start,
      rangeEnd: bounds.end,
    };
  } catch {
    return null;
  }
}
