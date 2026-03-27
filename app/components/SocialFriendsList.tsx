"use client";

import { useEffect, useState } from "react";
import { getFriendsList, type FriendListItem } from "@/app/actions/social";

export function SocialFriendsList() {
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<FriendListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { friends } = await getFriendsList();
      if (cancelled) return;
      setFriends(friends);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-100">Friends ({friends.length})</h3>
        <p className="text-xs text-zinc-500">Accepted</p>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-zinc-500">Loading…</p>
      ) : friends.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No friends yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {friends.map((f) => (
            <li
              key={f.friend_id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm font-medium text-zinc-100"
            >
              {f.username}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

