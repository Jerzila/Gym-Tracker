"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/components/Button";
import {
  acceptIncomingFriendRequest,
  declineIncomingFriendRequest,
  getIncomingFriendRequests,
  type IncomingFriendRequest,
} from "@/app/actions/social";
import { haptic } from "@/lib/haptic";

export function SocialRequestsClient() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<IncomingFriendRequest[]>([]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    async function refresh() {
      const { requests } = await getIncomingFriendRequests();
      if (cancelled) return;
      setRequests(requests);
      setLoading(false);
    }

    async function load() {
      await refresh();
      intervalId = window.setInterval(() => {
        refresh();
      }, 4000);
    }

    load();
    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  async function onAccept(requestId: string) {
    const res = await acceptIncomingFriendRequest(requestId);
    if (res.error) return;
    haptic();
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  async function onDecline(requestId: string) {
    const res = await declineIncomingFriendRequest(requestId);
    if (res.error) return;
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  return (
    <section className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-100">Friend Requests</h3>
        <p className="text-xs text-zinc-500">Incoming</p>
      </div>

      {loading ? (
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
              <span className="min-w-0 truncate text-sm font-medium text-zinc-100">
                {r.username || "Unknown user"}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => onDecline(r.id)}>
                  Decline
                </Button>
                <Button variant="primary" size="sm" onClick={() => onAccept(r.id)}>
                  Accept
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

