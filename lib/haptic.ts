/**
 * Trigger short vibration for onboarding / UI feedback.
 * Fails silently if vibration is unsupported (e.g. desktop).
 */
export function haptic(): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(10);
  } catch {
    // ignore
  }
}
