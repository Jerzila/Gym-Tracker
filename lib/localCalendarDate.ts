/**
 * The user's local calendar date as YYYY-MM-DD (not UTC).
 * Use when saving bodyweight log dates from the client so the day matches what they see.
 */
export function localCalendarDateYYYYMMDD(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
