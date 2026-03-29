import { TZDate } from "@date-fns/tz";
import { endOfWeek, format, startOfWeek } from "date-fns";

/** Monday–Sunday week containing `now`, in `timeZone`. Dates are `YYYY-MM-DD` for DB `workouts.date`. */
export function getWeekBoundsMondaySundayInTimeZone(
  timeZone: string,
  now: Date = new Date()
): { start: string; end: string; labelRange: string } {
  const tz = timeZone?.trim() || "UTC";
  const z = new TZDate(now.getTime(), tz);
  const monday = startOfWeek(z, { weekStartsOn: 1 });
  const sunday = endOfWeek(z, { weekStartsOn: 1 });
  const start = format(monday, "yyyy-MM-dd");
  const end = format(sunday, "yyyy-MM-dd");
  const sameYear = monday.getFullYear() === sunday.getFullYear();
  const labelRange = sameYear
    ? `${format(monday, "MMM d")} – ${format(sunday, "MMM d, yyyy")}`
    : `${format(monday, "MMM d, yyyy")} – ${format(sunday, "MMM d, yyyy")}`;
  return { start, end, labelRange };
}
