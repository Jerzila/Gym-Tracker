import type { SupabaseClient } from "@supabase/supabase-js";

export type BodyweightLogRow = { date: string; weight: number };

/**
 * Latest bodyweight log on or before `isoDate` (YYYY-MM-DD); otherwise profile fallback.
 */
export function resolveBodyweightKgFromLogs(
  isoDate: string,
  logsSortedAsc: BodyweightLogRow[],
  profileFallbackKg: number
): number {
  let best: BodyweightLogRow | null = null;
  for (const r of logsSortedAsc) {
    if (r.date <= isoDate && (!best || r.date > best.date)) best = r;
  }
  if (best != null && Number.isFinite(best.weight) && best.weight > 0) return best.weight;
  return Number.isFinite(profileFallbackKg) && profileFallbackKg > 0 ? profileFallbackKg : 0;
}

export type BodyweightSeries = {
  profileKg: number;
  logsAsc: BodyweightLogRow[];
};

export async function loadBodyweightSeriesForUser(
  supabase: SupabaseClient,
  userId: string,
  options?: { logsEndDateInclusive?: string }
): Promise<BodyweightSeries> {
  let logsQuery = supabase
    .from("bodyweight_logs")
    .select("date, weight")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });
  if (options?.logsEndDateInclusive) {
    logsQuery = logsQuery.lte("date", options.logsEndDateInclusive);
  }

  const [{ data: profile }, { data: logs }] = await Promise.all([
    supabase.from("profiles").select("body_weight").eq("id", userId).maybeSingle(),
    logsQuery,
  ]);
  const profileKg =
    profile?.body_weight != null && Number.isFinite(Number(profile.body_weight))
      ? Number(profile.body_weight)
      : 0;
  const logsAsc = (logs ?? [])
    .map((r) => ({
      date: String((r as { date: string }).date),
      weight: Number((r as { weight: unknown }).weight),
    }))
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && Number.isFinite(r.weight));
  return { profileKg, logsAsc };
}
