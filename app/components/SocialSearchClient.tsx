"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/Button";
import {
  searchUsersByUsername,
  sendFriendRequest,
  type SocialUserSearchResult,
} from "@/app/actions/social";
import { useProAccess } from "@/app/components/ProAccessProvider";
import { maybeShowInterstitialAfterFriendAdd } from "@/app/lib/adMob/interstitialController";

const inputClass =
  "w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-[rgba(255,170,0,0.6)] focus:outline-none focus:ring-0";

type SearchProps = {
  /** Pre-fill from URL (e.g. invite fallback). */
  initialQuery?: string | null;
};

export function SocialSearchClient({ initialQuery }: SearchProps) {
  const initial = (initialQuery ?? "").trim();
  const [query, setQuery] = useState(() => initial);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SocialUserSearchResult[]>([]);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(() => initial.length >= 2);
  const debounceRef = useRef<number | null>(null);
  const { ready, hasNoAds } = useProAccess();

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

  return (
    <section className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => {
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
                    const isFriend = u.relationship === "friend";
                    const isSent = u.relationship === "request_sent" || sentTo.has(u.id);
                    return (
                      <li
                        key={u.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-sm font-medium text-zinc-100">
                          {u.username}
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
  );
}

