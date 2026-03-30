"use server";

import { createServerClient } from "@/lib/supabase/server";
import { RANK_SLUGS, type RankSlug } from "@/lib/rankBadges";
import { computeStrengthRankingBundleForUser } from "@/lib/computeStrengthRankingForUser";
import {
  computeUserLifetimeWorkoutAggregatesForUser,
  countWorkoutSessionsFromDate,
  isoDateDaysAgoUTC,
} from "@/lib/computeUserWorkoutAggregates";
import { strongestMuscleSummaryFromPayload } from "@/lib/friendStrengthFromRankings";
import { getWeekBoundsMondaySundayInTimeZone } from "@/lib/weekBoundsTz";
import { format, parseISO, subDays } from "date-fns";
import {
  getStrengthRanking,
  rankingWithExercisesFromStoredRankingsJson,
  type StrengthRankingWithExercises,
} from "@/app/actions/strengthRanking";
import {
  computeStrengthRanking,
  type StrengthRankingOutput,
  type StrengthRankMuscle,
} from "@/lib/strengthRanking";
import { getUserLifetimeWorkoutAggregatesForUserId } from "@/app/actions/workouts";
import {
  FRIEND_LEADERBOARD_CATEGORIES,
  FRIEND_LEADERBOARD_MUSCLE_TABS,
  type FriendLeaderboardCategory,
  type FriendLeaderboardMuscleTab,
} from "@/lib/friendsLeaderboard";

export type SocialUserSearchResult = {
  id: string;
  username: string;
  relationship: "none" | "friend" | "request_sent";
};

export type IncomingFriendRequest = {
  id: string;
  sender_id: string;
  username: string;
  created_at: string;
};

export type FriendListItem = {
  friend_id: string;
  username: string;
};

export type FriendProfilePageData = {
  username: string;
  overall_rank: string;
  overall_percentile: number;
  rank_badge: RankSlug;
  top_percentile_display: string;
  workoutCount: number;
  prCount: number;
  totalVolumeKg: number;
  gender: "male" | "female";
  strengthRankingView: StrengthRankingWithExercises;
  bestMuscle: { linePrimary: string; linePercentile: string } | null;
  workoutsThisWeek: number;
  workoutStreak: number;
  lastWorkoutDate: string | null;
  lastWorkoutDisplay: string | null;
};

export type FriendLeaderboardEntry = {
  user_id: string;
  /** True for the logged-in row (highlight in UI). */
  is_current_user: boolean;
  username: string;
  /** Friends: `profiles.overall_rank`. Self: live Insights label (`computeStrengthRankingBundleForUser`). */
  overall_rank: string;
  /** Friends: `profiles.overall_percentile`. Self: parsed from live top label — lower = stronger; sort key. */
  overall_percentile: number;
  /** Friends: `profiles.rank_badge`. Self: live `overallRankSlug`. */
  rank_badge: RankSlug;
  /** Friends: formatted from stored percentile. Self: exact `overallTopPercentileLabel` from Insights. */
  top_percentile_display: string;
};

function parseRankBadgeSlug(raw: string | null | undefined): RankSlug {
  const s = String(raw ?? "").trim();
  return (RANK_SLUGS as readonly string[]).includes(s) ? (s as RankSlug) : "newbie";
}

function formatTopPercentDisplay(percentile: number): string {
  if (!Number.isFinite(percentile)) return "Top 100%";
  const r = Math.round(percentile * 10) / 10;
  return `Top ${r}%`;
}

/** Same numeric sort key as stored profile `overall_percentile` (from Top X% label). */
function percentileNumFromTopLabel(label: string): number {
  const m = String(label ?? "").trim().match(/Top\s*([\d.]+)\s*%/i);
  if (m) return parseFloat(m[1]);
  return 100;
}

function normalizeLeaderboardCategory(raw: string | undefined): FriendLeaderboardCategory {
  const s = String(raw ?? "overall").toLowerCase();
  return (FRIEND_LEADERBOARD_CATEGORIES as readonly string[]).includes(s)
    ? (s as FriendLeaderboardCategory)
    : "overall";
}

function normalizeMuscleTab(raw: string | undefined): FriendLeaderboardMuscleTab {
  const s = String(raw ?? "chest").toLowerCase();
  return (FRIEND_LEADERBOARD_MUSCLE_TABS as readonly string[]).includes(s)
    ? (s as FriendLeaderboardMuscleTab)
    : "chest";
}

function readOneMuscleJson(muscleJson: unknown, key: StrengthRankMuscle) {
  const root = muscleJson as Record<string, unknown> | null | undefined;
  const raw = root?.[key];
  if (!raw || typeof raw !== "object") {
    return {
      rankLabel: "Newbie I",
      rankSlug: parseRankBadgeSlug("newbie"),
      topPercentileLabel: "Top 96.6%",
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    rankLabel: String(o.rankLabel ?? "Newbie I"),
    rankSlug: parseRankBadgeSlug(String(o.rankSlug)),
    topPercentileLabel: String(o.topPercentileLabel ?? "Top 96.6%"),
  };
}

function muscleStatsFromRankingsJson(
  muscleJson: unknown,
  tab: FriendLeaderboardMuscleTab
): { rankLabel: string; rankSlug: RankSlug; topPercentileDisplay: string; sortPercentile: number } {
  const m = readOneMuscleJson(muscleJson, tab as StrengthRankMuscle);
  const sortPct = percentileNumFromTopLabel(m.topPercentileLabel);
  return {
    rankLabel: m.rankLabel,
    rankSlug: m.rankSlug,
    topPercentileDisplay: formatTopPercentDisplay(sortPct),
    sortPercentile: sortPct,
  };
}

function muscleStatsFromLiveRanks(
  muscleRanks: StrengthRankingOutput["muscleRanks"],
  tab: FriendLeaderboardMuscleTab
): { rankLabel: string; rankSlug: RankSlug; topPercentileDisplay: string; sortPercentile: number } {
  const m = muscleRanks[tab as StrengthRankMuscle];
  const sortPct = percentileNumFromTopLabel(m.topPercentileLabel);
  return {
    rankLabel: m.rankLabel,
    rankSlug: parseRankBadgeSlug(m.rankSlug),
    topPercentileDisplay: formatTopPercentDisplay(sortPct),
    sortPercentile: sortPct,
  };
}

function formatVolumeLeaderboardKg(kg: number): string {
  return `${Math.round(kg).toLocaleString("en-US")} kg`;
}

function formatPrLeaderboardLine(n: number): string {
  return `${n} PR${n === 1 ? "" : "s"}`;
}

function formatConsistencyLeaderboardLine(n: number): string {
  return `${n} workout${n === 1 ? "" : "s"}`;
}

function parseISODateOnly(iso: string): Date {
  return parseISO(iso.length === 10 ? `${iso}T12:00:00` : iso);
}

function formatFriendLastWorkout(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const s = String(iso).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  try {
    return format(parseISODateOnly(s), "MMM d, yyyy");
  } catch {
    return null;
  }
}

function workoutStreakFromDateSet(dateSet: Set<string>, lastDate: string): number {
  let count = 0;
  let d = lastDate;
  while (dateSet.has(d)) {
    count += 1;
    d = format(subDays(parseISODateOnly(d), 1), "yyyy-MM-dd");
  }
  return count;
}

export async function searchUsersByUsername(
  rawQuery: string
): Promise<{ results: SocialUserSearchResult[]; error?: string }> {
  const query = (rawQuery ?? "").trim();
  if (query.length < 2) return { results: [] };

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { results: [], error: "Not authenticated" };

  const { data: rows, error } = await supabase
    .from("profiles")
    .select("id, username")
    .ilike("username", `%${query}%`)
    .neq("id", user.id)
    .limit(10);

  if (error) return { results: [], error: error.message };

  const baseResults = (rows ?? [])
    .map((r) => ({
      id: String((r as any).id),
      username: String((r as any).username ?? ""),
    }))
    .filter((r) => r.id && r.username);

  const ids = baseResults.map((r) => r.id);
  if (ids.length === 0) return { results: [] };

  const [{ data: friendRows }, { data: reqRows }] = await Promise.all([
    supabase.from("friends").select("friend_id").eq("user_id", user.id).in("friend_id", ids),
    supabase
      .from("friend_requests")
      .select("receiver_id")
      .eq("sender_id", user.id)
      .eq("status", "pending")
      .in("receiver_id", ids),
  ]);

  const friendSet = new Set((friendRows ?? []).map((r) => String((r as any).friend_id)));
  const sentSet = new Set((reqRows ?? []).map((r) => String((r as any).receiver_id)));

  const results: SocialUserSearchResult[] = baseResults.map((r) => ({
    ...r,
    relationship: friendSet.has(r.id) ? "friend" : sentSet.has(r.id) ? "request_sent" : "none",
  }));

  return { results };
}

export async function sendFriendRequest(
  receiverId: string
): Promise<{ ok?: true; already?: boolean; error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const receiver_id = String(receiverId || "").trim();
  if (!receiver_id) return { error: "Missing receiver" };
  if (receiver_id === user.id) return { error: "You can't add yourself." };

  // Already friends?
  const { data: existingFriend } = await supabase
    .from("friends")
    .select("id")
    .eq("user_id", user.id)
    .eq("friend_id", receiver_id)
    .maybeSingle();
  if (existingFriend) return { already: true };

  // After unfriend, `friend_requests` can still be `accepted`; that must not block a new request.
  const { error: clearAcceptedErr } = await supabase
    .from("friend_requests")
    .delete()
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${user.id})`
    )
    .eq("status", "accepted");

  if (clearAcceptedErr) return { error: clearAcceptedErr.message };

  // Existing pending request in either direction? (accepted rows were cleared above when stale.)
  const { data: existingReq } = await supabase
    .from("friend_requests")
    .select("id, status, sender_id, receiver_id")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${user.id})`
    )
    .eq("status", "pending")
    .maybeSingle();
  if (existingReq) return { already: true };

  // Same pair (I was sender) was declined/rejected — unique (sender_id, receiver_id) blocks a new insert.
  const { data: declinedOut } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("sender_id", user.id)
    .eq("receiver_id", receiver_id)
    .in("status", ["declined", "rejected"])
    .maybeSingle();

  if (declinedOut) {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "pending", created_at: new Date().toISOString() })
      .eq("id", declinedOut.id)
      .eq("sender_id", user.id);
    if (error) return { error: error.message };
    return { ok: true };
  }

  const { error } = await supabase.from("friend_requests").insert({
    sender_id: user.id,
    receiver_id,
    status: "pending",
  });

  if (error?.code === "23505") return { already: true };
  if (error) return { error: error.message };
  return { ok: true };
}

export async function removeFriend(friendId: string): Promise<{ ok?: true; error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const fid = String(friendId || "").trim();
  if (!fid || fid === user.id) return { error: "Invalid friend" };

  // SECURITY DEFINER RPC deletes both (me→them) and (them→me) in one transaction; RLS cannot block half the pair.
  const { error } = await supabase.rpc("remove_friendship", { p_friend_id: fid });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function acceptIncomingFriendRequest(
  requestId: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const id = String(requestId || "").trim();
  if (!id) return { error: "Missing request" };

  const { error } = await supabase.rpc("accept_friend_request", { p_request_id: id });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function declineIncomingFriendRequest(
  requestId: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const id = String(requestId || "").trim();
  if (!id) return { error: "Missing request" };

  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "declined" })
    .eq("id", id)
    .eq("receiver_id", user.id);

  if (error) return { error: error.message };
  return { ok: true };
}

export async function getIncomingFriendRequests(): Promise<{
  requests: IncomingFriendRequest[];
  error?: string;
}> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { requests: [], error: "Not authenticated" };

  // Avoid embedding `profiles` in one query: friend_requests has two FKs to profiles (sender + receiver),
  // which makes PostgREST embedding ambiguous and can return no rows or fail silently per version.
  const { data: reqRows, error: reqErr } = await supabase
    .from("friend_requests")
    .select("id, sender_id, created_at")
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (reqErr) return { requests: [], error: reqErr.message };

  const rows = reqRows ?? [];
  if (rows.length === 0) return { requests: [] };

  const senderIds = [...new Set(rows.map((r) => String((r as { sender_id: string }).sender_id)))];
  const { data: profileRows } = await supabase.from("profiles").select("id, username").in("id", senderIds);

  const usernameById = new Map(
    (profileRows ?? []).map((p) => [String((p as { id: string }).id), String((p as { username?: string | null }).username ?? "")])
  );

  const requests: IncomingFriendRequest[] = rows.map((r) => {
    const row = r as { id: string; sender_id: string; created_at: string };
    return {
      id: String(row.id),
      sender_id: String(row.sender_id),
      created_at: String(row.created_at),
      username: usernameById.get(String(row.sender_id)) ?? "",
    };
  });

  return { requests };
}

export async function getFriendsList(): Promise<{ friends: FriendListItem[]; error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { friends: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("friends")
    .select("friend_id, friend:profiles!friends_friend_id_fkey(username)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { friends: [], error: error.message };

  const friends: FriendListItem[] = (data ?? []).map((r: any) => ({
    friend_id: String(r.friend_id),
    username: String(r.friend?.username ?? ""),
  }));

  return { friends: friends.filter((f) => f.username) };
}

/** Profile + lifetime workout stats for an accepted friend only. */
export async function getFriendProfilePageData(
  friendId: string
): Promise<{ data: FriendProfilePageData | null; error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const fid = String(friendId || "").trim();
  if (!fid || fid === user.id) return { data: null, error: "not_friend" };

  const { data: friendRow } = await supabase
    .from("friends")
    .select("id")
    .eq("user_id", user.id)
    .eq("friend_id", fid)
    .maybeSingle();
  if (!friendRow) return { data: null, error: "not_friend" };

  const weekBounds = getWeekBoundsMondaySundayInTimeZone("UTC");

  const [profileRes, aggRes, rankingsRes, lastWorkoutRes, weekWorkoutsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, overall_rank, overall_percentile, rank_badge, gender")
      .eq("id", fid)
      .maybeSingle(),
    getUserLifetimeWorkoutAggregatesForUserId(fid),
    supabase.from("rankings").select("muscle_ranks, muscle_scores").eq("user_id", fid).maybeSingle(),
    supabase.from("workouts").select("date").eq("user_id", fid).order("date", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("workouts")
      .select("date")
      .eq("user_id", fid)
      .gte("date", weekBounds.start)
      .lte("date", weekBounds.end),
  ]);

  const { data: profile, error: pErr } = profileRes;
  if (pErr) return { data: null, error: pErr.message };
  if (!profile) return { data: null, error: "not_found" };

  const { error: aErr } = aggRes;
  if (aErr) return { data: null, error: aErr };
  const agg = aggRes.data;

  const rkRow = rankingsRes.data;
  const strengthRankingView = await rankingWithExercisesFromStoredRankingsJson(
    rkRow?.muscle_ranks,
    rkRow?.muscle_scores
  );
  const parsedMuscles = strongestMuscleSummaryFromPayload(
    strengthRankingView.muscleRanks,
    strengthRankingView.muscleScores
  );
  const bestMuscle = parsedMuscles
    ? { linePrimary: parsedMuscles.linePrimary, linePercentile: parsedMuscles.linePercentile }
    : null;

  const lastWorkoutDate = lastWorkoutRes.data?.date ? String(lastWorkoutRes.data.date) : null;
  const lastWorkoutDisplay = formatFriendLastWorkout(lastWorkoutDate);

  const weekRows = weekWorkoutsRes.data ?? [];
  const workoutsThisWeek = new Set(weekRows.map((r) => String((r as { date: string }).date))).size;

  let workoutStreak = 0;
  if (lastWorkoutDate) {
    const streakMin = format(subDays(parseISODateOnly(lastWorkoutDate), 500), "yyyy-MM-dd");
    const { data: streakRows } = await supabase
      .from("workouts")
      .select("date")
      .eq("user_id", fid)
      .gte("date", streakMin);
    const dateSet = new Set((streakRows ?? []).map((r) => String((r as { date: string }).date)));
    workoutStreak = workoutStreakFromDateSet(dateSet, lastWorkoutDate);
  }

  const pctRaw = Number((profile as { overall_percentile?: unknown }).overall_percentile);
  const overall_percentile = Number.isFinite(pctRaw) ? pctRaw : 100;
  const genderRaw = (profile as { gender?: string | null }).gender;
  const gender: "male" | "female" = genderRaw === "female" ? "female" : "male";

  return {
    data: {
      username: String((profile as { username?: string | null }).username ?? ""),
      overall_rank: String((profile as { overall_rank?: string | null }).overall_rank ?? "Newbie I"),
      overall_percentile,
      rank_badge: parseRankBadgeSlug((profile as { rank_badge?: string | null }).rank_badge),
      top_percentile_display: formatTopPercentDisplay(overall_percentile),
      workoutCount: agg?.workoutCount ?? 0,
      prCount: agg?.prCount ?? 0,
      totalVolumeKg: agg?.totalVolumeKg ?? 0,
      gender,
      strengthRankingView,
      bestMuscle,
      workoutsThisWeek,
      workoutStreak,
      lastWorkoutDate,
      lastWorkoutDisplay,
    },
  };
}

export type StrengthCompareWithFriendPageData = {
  friendUsername: string;
  friendGender: "male" | "female";
  myGender: "male" | "female";
  myStrength: StrengthRankingWithExercises;
  friendStrength: StrengthRankingWithExercises;
};

/** You vs friend strength maps — only for accepted friends. */
export async function getStrengthCompareWithFriendPageData(
  friendId: string
): Promise<{ data: StrengthCompareWithFriendPageData | null; error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const fid = String(friendId || "").trim();
  if (!fid || fid === user.id) return { data: null, error: "not_friend" };

  const { data: friendRow } = await supabase
    .from("friends")
    .select("id")
    .eq("user_id", user.id)
    .eq("friend_id", fid)
    .maybeSingle();
  if (!friendRow) return { data: null, error: "not_friend" };

  const [myRankingRes, myProfileRes, friendProfileRes, friendRankingRes] = await Promise.all([
    getStrengthRanking(),
    supabase.from("profiles").select("gender").eq("id", user.id).maybeSingle(),
    supabase.from("profiles").select("username, gender").eq("id", fid).maybeSingle(),
    supabase.from("rankings").select("muscle_ranks, muscle_scores").eq("user_id", fid).maybeSingle(),
  ]);

  const friendProfile = friendProfileRes.data;
  if (!friendProfile?.username) return { data: null, error: "not_found" };

  const myStrength =
    myRankingRes.data ?? (await rankingWithExercisesFromStoredRankingsJson(null, null));
  const friendStrength = await rankingWithExercisesFromStoredRankingsJson(
    friendRankingRes.data?.muscle_ranks,
    friendRankingRes.data?.muscle_scores
  );

  const myGenderRaw = myProfileRes.data?.gender;
  const friendGenderRaw = (friendProfile as { gender?: string | null }).gender;

  return {
    data: {
      friendUsername: String(friendProfile.username),
      friendGender: friendGenderRaw === "female" ? "female" : "male",
      myGender: myGenderRaw === "female" ? "female" : "male",
      myStrength,
      friendStrength,
    },
  };
}

export async function getFriendsLeaderboard(options?: {
  category?: string;
  muscle?: string;
}): Promise<{
  entries: FriendLeaderboardEntry[];
  error?: string;
}> {
  try {
    return await getFriendsLeaderboardInner(options);
  } catch (e) {
    return {
      entries: [],
      error: e instanceof Error ? e.message : "Could not load leaderboard.",
    };
  }
}

async function getFriendsLeaderboardInner(options?: {
  category?: string;
  muscle?: string;
}): Promise<{
  entries: FriendLeaderboardEntry[];
  error?: string;
}> {
  const category = normalizeLeaderboardCategory(options?.category);
  const muscleTab = normalizeMuscleTab(options?.muscle);

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { entries: [], error: "Not authenticated" };

  const { data: friendRows, error: friendsErr } = await supabase
    .from("friends")
    .select("friend_id")
    .eq("user_id", user.id);

  if (friendsErr) return { entries: [], error: friendsErr.message };

  const friendIds = [...new Set((friendRows ?? []).map((r: { friend_id: string }) => String(r.friend_id)))];
  const leaderboardIds = [...new Set([user.id, ...friendIds])];

  const since30 = isoDateDaysAgoUTC(30);
  const needWorkoutStats =
    category === "volume" || category === "prs" || category === "consistency";

  const profileSelectFull =
    "id, username, overall_rank, overall_percentile, rank_badge, total_volume, total_prs, workouts_last_30_days";
  const profileSelectBase = "id, username, overall_rank, overall_percentile, rank_badge";

  let profileRows: Record<string, unknown>[] | null = null;
  const fullRes = await supabase.from("profiles").select(profileSelectFull).in("id", leaderboardIds);
  if (fullRes.error) {
    const baseRes = await supabase.from("profiles").select(profileSelectBase).in("id", leaderboardIds);
    if (baseRes.error) return { entries: [], error: baseRes.error.message };
    profileRows = (baseRes.data ?? []) as Record<string, unknown>[];
  } else {
    profileRows = (fullRes.data ?? []) as Record<string, unknown>[];
  }

  const [rankingRes, live] = await Promise.all([
    supabase
      .from("rankings")
      .select(
        "user_id, muscle_ranks, overall_rank_label, overall_rank_slug, overall_top_percentile_label"
      )
      .in("user_id", leaderboardIds),
    computeStrengthRankingBundleForUser(supabase, user.id),
  ]);

  if (rankingRes.error) return { entries: [], error: rankingRes.error.message };

  const rankingRows = (rankingRes.data ?? []) as {
    user_id: string;
    muscle_ranks: unknown;
    overall_rank_label?: string | null;
    overall_rank_slug?: string | null;
    overall_top_percentile_label?: string | null;
  }[];

  type RankingLeaderboardCols = {
    muscle_ranks: unknown;
    overall_rank_label: string;
    overall_rank_slug: string;
    overall_top_percentile_label: string;
  };

  const rankingByUserId = new Map<string, RankingLeaderboardCols>();
  for (const r of rankingRows) {
    const uid = String(r.user_id);
    rankingByUserId.set(uid, {
      muscle_ranks: r.muscle_ranks,
      overall_rank_label: String(r.overall_rank_label ?? "").trim(),
      overall_rank_slug: String(r.overall_rank_slug ?? "").trim(),
      overall_top_percentile_label: String(r.overall_top_percentile_label ?? "").trim(),
    });
  }

  const liveOut = live.ok
    ? live.bundle.output
    : computeStrengthRanking({ exerciseDataPoints: [], bodyweightKg: 0 });

  const aggByUser = new Map<string, { totalVolumeKg: number; prCount: number }>();
  const w30ByUser = new Map<string, number>();
  if (needWorkoutStats) {
    const perUser = await Promise.all(
      leaderboardIds.map(async (uid) => {
        const [agg, w30] = await Promise.all([
          computeUserLifetimeWorkoutAggregatesForUser(supabase, uid),
          countWorkoutSessionsFromDate(supabase, uid, since30),
        ]);
        return {
          uid,
          totalVolumeKg: agg.data?.totalVolumeKg ?? 0,
          prCount: agg.data?.prCount ?? 0,
          w30: w30.count ?? 0,
        };
      })
    );
    for (const row of perUser) {
      aggByUser.set(row.uid, { totalVolumeKg: row.totalVolumeKg, prCount: row.prCount });
      w30ByUser.set(row.uid, row.w30);
    }
  }

  type ProfileLeaderboardRow = {
    username: string;
    overall_rank: string;
    overall_percentile: number;
    rank_badge: RankSlug;
    total_volume: number;
    total_prs: number;
    workouts_last_30_days: number;
  };

  const profileById = new Map<string, ProfileLeaderboardRow>(
    profileRows.map((p: Record<string, unknown>) => {
      const id = String(p.id);
      const tv = Number(p.total_volume);
      const tp = Number(p.total_prs);
      const w30 = Number(p.workouts_last_30_days);
      return [
        id,
        {
          username: String(p.username ?? ""),
          overall_rank: String(p.overall_rank ?? "Newbie I"),
          overall_percentile: Number.isFinite(Number(p.overall_percentile))
            ? Number(p.overall_percentile)
            : 100,
          rank_badge: parseRankBadgeSlug(p.rank_badge as string | null | undefined),
          total_volume: Number.isFinite(tv) ? tv : 0,
          total_prs: Number.isFinite(tp) ? Math.floor(tp) : 0,
          workouts_last_30_days: Number.isFinite(w30) ? Math.floor(w30) : 0,
        },
      ];
    })
  );

  function overallDisplayForFriend(uid: string, p: ProfileLeaderboardRow) {
    const rk = rankingByUserId.get(uid);
    if (rk && rk.overall_rank_label.length > 0) {
      const topLabel =
        rk.overall_top_percentile_label.length > 0 ? rk.overall_top_percentile_label : "Top 100%";
      const sortPct = percentileNumFromTopLabel(topLabel);
      return {
        overall_rank: rk.overall_rank_label,
        overall_percentile: sortPct,
        rank_badge: parseRankBadgeSlug(rk.overall_rank_slug),
        top_percentile_display: topLabel.match(/Top\s*[\d.]+\s*%/i)
          ? topLabel
          : formatTopPercentDisplay(sortPct),
      };
    }
    return {
      overall_rank: p.overall_rank,
      overall_percentile: p.overall_percentile,
      rank_badge: p.rank_badge,
      top_percentile_display: formatTopPercentDisplay(p.overall_percentile),
    };
  }

  function overallBadgeForUser(uid: string, p: ProfileLeaderboardRow): RankSlug {
    const rk = rankingByUserId.get(uid);
    if (rk && rk.overall_rank_slug.length > 0) return parseRankBadgeSlug(rk.overall_rank_slug);
    return p.rank_badge;
  }

  type SortWork = { entry: FriendLeaderboardEntry; sortPrimary: number; sortSecondary: string };
  const work: SortWork[] = [];

  for (const uid of leaderboardIds) {
    const p = profileById.get(uid);
    if (!p || !p.username) continue;

    const isMe = uid === user.id;
    const muscleJson = rankingByUserId.get(uid)?.muscle_ranks;

    if (category === "overall") {
      if (isMe) {
        work.push({
          entry: {
            user_id: user.id,
            is_current_user: true,
            username: p.username,
            overall_rank: liveOut.overallRankLabel,
            overall_percentile: percentileNumFromTopLabel(liveOut.overallTopPercentileLabel),
            rank_badge: parseRankBadgeSlug(liveOut.overallRankSlug),
            top_percentile_display: liveOut.overallTopPercentileLabel,
          },
          sortPrimary: percentileNumFromTopLabel(liveOut.overallTopPercentileLabel),
          sortSecondary: p.username,
        });
      } else {
        const o = overallDisplayForFriend(uid, p);
        work.push({
          entry: {
            user_id: uid,
            is_current_user: false,
            username: p.username,
            overall_rank: o.overall_rank,
            overall_percentile: o.overall_percentile,
            rank_badge: o.rank_badge,
            top_percentile_display: o.top_percentile_display,
          },
          sortPrimary: o.overall_percentile,
          sortSecondary: p.username,
        });
      }
      continue;
    }

    if (category === "muscles") {
      const ms = isMe
        ? muscleStatsFromLiveRanks(liveOut.muscleRanks, muscleTab)
        : muscleStatsFromRankingsJson(muscleJson, muscleTab);
      work.push({
        entry: {
          user_id: uid,
          is_current_user: isMe,
          username: p.username,
          overall_rank: ms.rankLabel,
          overall_percentile: ms.sortPercentile,
          rank_badge: ms.rankSlug,
          top_percentile_display: ms.topPercentileDisplay,
        },
        sortPrimary: ms.sortPercentile,
        sortSecondary: p.username,
      });
      continue;
    }

    if (category === "volume") {
      const vol = aggByUser.get(uid)?.totalVolumeKg ?? 0;
      work.push({
        entry: {
          user_id: uid,
          is_current_user: isMe,
          username: p.username,
          overall_rank: formatVolumeLeaderboardKg(vol),
          overall_percentile: 0,
          rank_badge: isMe ? parseRankBadgeSlug(liveOut.overallRankSlug) : overallBadgeForUser(uid, p),
          top_percentile_display: "",
        },
        sortPrimary: -vol,
        sortSecondary: p.username,
      });
      continue;
    }

    if (category === "prs") {
      const n = aggByUser.get(uid)?.prCount ?? 0;
      work.push({
        entry: {
          user_id: uid,
          is_current_user: isMe,
          username: p.username,
          overall_rank: formatPrLeaderboardLine(n),
          overall_percentile: 0,
          rank_badge: isMe ? parseRankBadgeSlug(liveOut.overallRankSlug) : overallBadgeForUser(uid, p),
          top_percentile_display: "",
        },
        sortPrimary: -n,
        sortSecondary: p.username,
      });
      continue;
    }

    const n = w30ByUser.get(uid) ?? 0;
    work.push({
      entry: {
        user_id: uid,
        is_current_user: isMe,
        username: p.username,
        overall_rank: formatConsistencyLeaderboardLine(n),
        overall_percentile: 0,
        rank_badge: isMe ? parseRankBadgeSlug(liveOut.overallRankSlug) : overallBadgeForUser(uid, p),
        top_percentile_display: "",
      },
      sortPrimary: -n,
      sortSecondary: p.username,
    });
  }

  work.sort((a, b) => {
    if (a.sortPrimary !== b.sortPrimary) return a.sortPrimary - b.sortPrimary;
    return a.sortSecondary.localeCompare(b.sortSecondary);
  });

  return { entries: work.map((w) => w.entry) };
}

