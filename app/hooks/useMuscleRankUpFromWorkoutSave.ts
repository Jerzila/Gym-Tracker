"use client";

import { useCallback, useEffect, useState } from "react";
import type { MuscleRankUpClientPayload } from "@/lib/buildMuscleRankUpClientPayload";

type WorkoutSaveState = {
  message?: string;
  rankUp?: MuscleRankUpClientPayload;
  workoutId?: string;
} | null;

function consumedKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const w = window as Window & { __liftlyRankUpConsumed?: Set<string> };
  if (!w.__liftlyRankUpConsumed) w.__liftlyRankUpConsumed = new Set();
  return w.__liftlyRankUpConsumed;
}

/**
 * Opens the rank-up modal once per successful save. Dedupes React Strict Mode remounts
 * via an in-memory Set (same tab session). sessionStorage is set on dismiss to avoid
 * re-showing if the same action result is replayed before navigation.
 */
export function useMuscleRankUpFromWorkoutSave(state: WorkoutSaveState) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<MuscleRankUpClientPayload | null>(null);

  useEffect(() => {
    if (!state?.rankUp || !state.message || !state.workoutId) return;
    const key = state.rankUp.dedupeKey;
    const sk = `liftly:rankUpDismissed:${key}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(sk)) return;
    const consumed = consumedKeys();
    if (consumed.has(key)) return;
    consumed.add(key);
    queueMicrotask(() => {
      setPayload(state.rankUp!);
      setOpen(true);
    });
  }, [state]);

  const dismiss = useCallback(() => {
    setOpen(false);
    if (payload && typeof window !== "undefined") {
      sessionStorage.setItem(`liftly:rankUpDismissed:${payload.dedupeKey}`, "1");
    }
    window.setTimeout(() => setPayload(null), 280);
  }, [payload]);

  return { open, payload, dismiss };
}
