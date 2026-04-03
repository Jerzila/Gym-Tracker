/** Clock-style duration for holds: "2:15", "1:30", "45" (under 1 min). */
export function formatDurationClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(Number(totalSeconds)));
  if (!Number.isFinite(s)) return "0";
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return String(r);
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** Tooltip line: "1:30" or "45 sec" under one minute. */
export function formatDurationTooltip(totalSeconds: number): string {
  const s = Math.max(0, Math.round(Number(totalSeconds)));
  if (!Number.isFinite(s)) return "0 sec";
  if (s >= 60) return formatDurationClock(s);
  return `${s} sec`;
}
