"use server";

import { createServerClient } from "@/lib/supabase/server";

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

  // Existing pending request in either direction?
  const { data: existingReq } = await supabase
    .from("friend_requests")
    .select("id, status, sender_id, receiver_id")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${user.id})`
    )
    .in("status", ["pending", "accepted"])
    .maybeSingle();
  if (existingReq) return { already: true };

  const { error } = await supabase.from("friend_requests").insert({
    sender_id: user.id,
    receiver_id,
    status: "pending",
  });

  if (error?.code === "23505") return { already: true };
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

  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, sender_id, created_at, profiles:sender_id(username)")
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return { requests: [], error: error.message };

  const requests: IncomingFriendRequest[] = (data ?? []).map((r: any) => ({
    id: String(r.id),
    sender_id: String(r.sender_id),
    created_at: String(r.created_at),
    username: String(r.profiles?.username ?? ""),
  }));

  // Don't drop rows if sender profile is temporarily unreadable (RLS) or missing username.
  // The UI can still show the request and allow accept/decline.
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

