import { recalculateUserRankings } from "@/lib/recalculateUserRankings";

/** Persists `rankings` from current workouts + profile; failures are logged only (do not block UX). */
export async function refreshUserRankingsSafe(userId: string): Promise<void> {
  try {
    await recalculateUserRankings(userId);
  } catch (e) {
    console.error("[rankings] recalculate failed for", userId, e);
  }
}
