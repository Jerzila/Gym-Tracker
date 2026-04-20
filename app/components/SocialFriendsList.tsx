"use client";

import { useEffect, useState } from "react";
import { FriendListRowWithMenu } from "@/app/components/FriendListRowWithMenu";
import { getFriendsList, type FriendListItem } from "@/app/actions/social";
import { showCrownForLiftlyPro } from "@/lib/showRankCrown";

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
  );
}

