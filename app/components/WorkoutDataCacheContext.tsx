"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { InsightsInitialData } from "@/app/actions/insights";

type CacheState = {
  insights: InsightsInitialData | null;
  timestamp: number;
};

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

const WorkoutDataCacheContext = createContext<{
  getCachedInsights: () => InsightsInitialData | null;
  setCachedInsights: (data: InsightsInitialData) => void;
  invalidate: () => void;
} | null>(null);

export function WorkoutDataCacheProvider({ children }: { children: ReactNode }) {
  const cacheRef = useRef<CacheState>({ insights: null, timestamp: 0 });

  const getCachedInsights = useCallback(() => {
    const { insights, timestamp } = cacheRef.current;
    if (!insights) return null;
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return insights;
  }, []);

  const setCachedInsights = useCallback((data: InsightsInitialData) => {
    cacheRef.current = { insights: data, timestamp: Date.now() };
  }, []);

  const invalidate = useCallback(() => {
    cacheRef.current = { insights: null, timestamp: 0 };
  }, []);

  const value = useMemo(
    () => ({ getCachedInsights, setCachedInsights, invalidate }),
    [getCachedInsights, setCachedInsights, invalidate]
  );

  return (
    <WorkoutDataCacheContext.Provider value={value}>
      {children}
    </WorkoutDataCacheContext.Provider>
  );
}

export function useWorkoutDataCache() {
  const ctx = useContext(WorkoutDataCacheContext);
  return ctx;
}
