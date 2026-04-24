"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/app/components/Button";
import { sendFriendRequest, type SocialProfileRelationship } from "@/app/actions/social";
import { useProAccess } from "@/app/components/ProAccessProvider";
import { maybeShowInterstitialAfterFriendAdd } from "@/app/lib/adMob/interstitialController";

type Props = {
  subjectUserId: string;
  initialRelationship: SocialProfileRelationship;
};

export function ProfileFriendActions({ subjectUserId, initialRelationship }: Props) {
  const [relationship, setRelationship] = useState(initialRelationship);
  const [busy, setBusy] = useState(false);
  const { ready, hasNoAds } = useProAccess();

  if (relationship === "friend") return null;

  if (relationship === "request_sent") {
    return (
      <p className="mt-4 text-center text-sm text-zinc-500" role="status">
        Friend request sent
      </p>
    );
  }

  if (relationship === "request_received") {
    return (
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
        <p className="text-sm text-zinc-300">This person sent you a friend request.</p>
        <Link
          href="/social/requests"
          className="mt-3 inline-flex text-sm font-semibold text-amber-500 hover:text-amber-400"
        >
          Open Friend Requests
        </Link>
      </div>
    );
  }

  async function onAdd() {
    setBusy(true);
    const res = await sendFriendRequest(subjectUserId);
    setBusy(false);
    if (res.error) return;
    setRelationship("request_sent");
    if (ready) {
      void maybeShowInterstitialAfterFriendAdd(hasNoAds);
    }
  }

  return (
    <div className="mt-4">
      <Button variant="primary" className="w-full py-3.5 text-sm font-semibold" disabled={busy} onClick={onAdd}>
        {busy ? "Sending…" : "Add Friend"}
      </Button>
    </div>
  );
}
