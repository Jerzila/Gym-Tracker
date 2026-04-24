"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, buttonClass } from "@/app/components/Button";
import { haptic } from "@/lib/haptic";
import { FriendListRowWithMenu } from "@/app/components/FriendListRowWithMenu";
import {
  acceptIncomingFriendRequest,
  declineIncomingFriendRequest,
  getFriendsList,
  getIncomingFriendRequests,
  searchUsersByUsername,
  sendFriendRequest,
  type FriendListItem,
  type IncomingFriendRequest,
  type SocialUserSearchResult,
} from "@/app/actions/social";
import { RankCrownIcon } from "@/app/components/RankCrownIcon";
import { showCrownForLiftlyPro } from "@/lib/showRankCrown";
import { useProAccess } from "@/app/components/ProAccessProvider";
import { maybeShowInterstitialAfterFriendAdd } from "@/app/lib/adMob/interstitialController";

const inputClass =
  "w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[rgba(255,170,0,0.6)] focus:outline-none focus:ring-0";

export function SocialFriendsClient() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SocialUserSearchResult[]>([]);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [requests, setRequests] = useState<IncomingFriendRequest[]>([]);
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const debounceRef = useRef<number | null>(null);
  const { ready, hasNoAds } = useProAccess();

  const friendIdSet = useMemo(() => new Set(friends.map((f) => f.friend_id)), [friends]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    async function refreshIncoming() {
      const { requests } = await getIncomingFriendRequests();
      if (cancelled) return;
      setRequests(requests);
    }
    async function load() {
      setLoadingLists(true);
      const [{ requests }, { friends }] = await Promise.all([
        getIncomingFriendRequests(),
        getFriendsList(),
      ]);
      if (cancelled) return;
      setRequests(requests);
      setFriends(friends);
      setLoadingLists(false);

      // Poll for new incoming requests so the receiver sees them appear.
      intervalId = window.setInterval(() => {
        refreshIncoming();
      }, 4000);
    }
    load();
    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (q.length < 2) {
      setSearching(false);
      setResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      const { results } = await searchUsersByUsername(q);
      setResults(results);
      setSearching(false);
    }, 300);
  }, [query]);

  async function onSendRequest(userId: string) {
    setSentTo((prev) => new Set(prev).add(userId));
    const res = await sendFriendRequest(userId);
    if (res.error) {
      setSentTo((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      return;
    }
    setResults((prev) =>
      prev.map((r) => (r.id === userId ? { ...r, relationship: "request_sent" } : r))
    );
    if (ready) {
      void maybeShowInterstitialAfterFriendAdd(hasNoAds);
    }
  }

  async function onAccept(requestId: string) {
    const res = await acceptIncomingFriendRequest(requestId);
    if (res.error) return;
    haptic();

    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    const { friends } = await getFriendsList();
    setFriends(friends);
  }

  async function onDecline(requestId: string) {
    const res = await declineIncomingFriendRequest(requestId);
    if (res.error) return;
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  return (
    <div className="mt-5 space-y-6">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-100">Search Users</h3>
          <p className="text-xs text-zinc-500">Search by username</p>
        </div>

        <div className="relative mt-3">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => {
              // Allow clicking buttons inside dropdown.
              window.setTimeout(() => setSearchOpen(false), 120);
            }}
            className={inputClass}
            placeholder="Search usernames…"
            aria-label="Search users by username"
            autoComplete="off"
          />

          {searchOpen && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl">
              <div className="max-h-72 overflow-auto p-2">
                {searching ? (
                  <div className="px-2 py-2 text-sm text-zinc-500">Searching…</div>
                ) : results.length === 0 ? (
                  <div className="px-2 py-2 text-sm text-zinc-500">No users found</div>
                ) : (
                  <ul className="space-y-1">
                    {results.map((u) => {
                      const isFriend = friendIdSet.has(u.id) || u.relationship === "friend";
                      const isSent = u.relationship === "request_sent" || sentTo.has(u.id);
                      return (
                        <li
                          key={u.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                        >
                          <span className="flex min-w-0 items-center gap-1 truncate text-sm font-medium text-zinc-100">
                            <span className="truncate">{u.username}</span>
                            {showCrownForLiftlyPro(u.liftly_pro) ? <RankCrownIcon size={15} title="Liftly Pro" /> : null}
                          </span>
                          {isFriend ? (
                            <span className="text-xs text-zinc-400">Friends</span>
                          ) : isSent ? (
                            <span className="text-xs text-zinc-500">Request Sent</span>
                          ) : (
                            <Button variant="primary" size="sm" onClick={() => onSendRequest(u.id)}>
                              Add Friend
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="mt-2 text-xs text-zinc-500">Type at least 2 characters to search.</p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-100">Friend Requests</h3>
          <p className="text-xs text-zinc-500">Incoming</p>
        </div>

        {loadingLists ? (
          <p className="mt-3 text-sm text-zinc-500">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No pending requests.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-1 truncate text-sm font-medium text-zinc-100">
                  <span className="truncate">{r.username || "Unknown user"}</span>
                  {showCrownForLiftlyPro(r.liftly_pro) ? <RankCrownIcon size={15} title="Liftly Pro" /> : null}
                </span>
                <div className="flex shrink-0 gap-2">
                  <Button variant="primary" size="sm" onClick={() => onAccept(r.id)}>
                    Accept
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onDecline(r.id)}>
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-100">Friends List</h3>
          <p className="text-xs text-zinc-500">Accepted</p>
        </div>

        {loadingLists ? (
          <p className="mt-3 text-sm text-zinc-500">Loading…</p>
        ) : friends.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No friends yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {friends.map((f) => (
              <li key={f.friend_id}>
                <FriendListRowWithMenu
                  friendId={f.friend_id}
                  username={f.username}
                  showCrown={showCrownForLiftlyPro(f.liftly_pro)}
                  onRemoved={(id) => setFriends((prev) => prev.filter((x) => x.friend_id !== id))}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

