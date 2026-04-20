"use client";

import { useEffect } from "react";
import { useProAccess } from "@/app/components/ProAccessProvider";
import {
  consumeExerciseOpenDedupe,
  maybeShowInterstitialAfterExerciseOpen,
} from "@/app/lib/adMob/interstitialController";

/** Counts exercise screen opens (for every 3rd open daily) and may show an interstitial. */
export function ExerciseInterstitialTracker({ exerciseId }: { exerciseId: string }) {
  const { ready, hasNoAds } = useProAccess();

  useEffect(() => {
    if (!ready) return;
    if (!consumeExerciseOpenDedupe(exerciseId)) return;
    void maybeShowInterstitialAfterExerciseOpen(hasNoAds);
  }, [ready, hasNoAds, exerciseId]);

  return null;
}
