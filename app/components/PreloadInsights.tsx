"use client";

import { useEffect } from "react";
import { getInsightsInitialData } from "@/app/actions/insights";
import { useWorkoutDataCache } from "@/app/components/WorkoutDataCacheContext";

/**
 * Preloads insights data in the background when the user is on a protected page.
 * Warms the cache so the Insights page shows data immediately when navigated to.
 */
export function PreloadInsights() {
  const cache = useWorkoutDataCache();

  useEffect(() => {
    if (!cache?.setCachedInsights) return;
    // Skip if we already have fresh cache (avoid duplicate work)
    const existing = cache.getCachedInsights?.() ?? null;
    if (existing) return;

    let cancelled = false;
    getInsightsInitialData().then((data) => {
      if (!cancelled) cache.setCachedInsights(data);
    });
    return () => {
      cancelled = true;
    };
  }, [cache]);
  return null;
}
