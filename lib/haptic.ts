function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}

/**
 * Trigger short vibration for onboarding / UI feedback.
 * Fails silently if vibration is unsupported (e.g. desktop).
 */
export function haptic(): void {
  vibrate(10);
}

/** After a successful workout log; slightly richer pattern when a PR is detected. */
export function hapticWorkoutSaved(hitPr: boolean): void {
  vibrate(hitPr ? [10, 35, 10] : 10);
}
