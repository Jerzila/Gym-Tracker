/**
 * Week bounds: Monday–Sunday (UTC).
 * offset 0 = this week, -1 = last week, etc.
 */
export function getWeekBounds(offset: number = 0): { start: string; end: string } {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysFromMonday = (utcDay + 6) % 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysFromMonday + offset * 7);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

/**
 * Month bounds (UTC): first day 00:00 to last day 23:59.
 * offset 0 = this month, -1 = last month.
 */
export function getMonthBounds(offset: number = 0): { start: string; end: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + offset;
  return getMonthBoundsFor(y, m);
}

/**
 * Bounds for a specific calendar month (1-based month: 1 = January).
 * Use getMonthBoundsFor(year, month - 1) if you have 0-based month.
 */
export function getMonthBoundsFor(
  year: number,
  monthIndex: number
): { start: string; end: string } {
  const normalized = new Date(Date.UTC(year, monthIndex, 1));
  const y = normalized.getUTCFullYear();
  const m = normalized.getUTCMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

/** Current UTC year and 0-based month for default month selector. */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

/**
 * Progress through the current week (0–1). Week starts Monday 00:00 UTC.
 * Used for pace comparison: expected progress = last week total × weekProgress.
 */
export function getWeekProgress(): number {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysFromMonday = (utcDay + 6) % 7;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - daysFromMonday);
  weekStart.setUTCHours(0, 0, 0, 0);
  const elapsed = now.getTime() - weekStart.getTime();
  const weekLengthMs = DAYS_PER_WEEK * MS_PER_DAY;
  return Math.min(1, Math.max(0, elapsed / weekLengthMs));
}
