"use client";

import Link from "next/link";
import { useProAccess } from "@/app/components/ProAccessProvider";

export function FriendCompareButton({
  href,
  isFriend,
}: {
  href: string;
  isFriend: boolean;
}) {
  const { hasPro, requirePro } = useProAccess();

  if (!isFriend) return null;

  if (!hasPro) {
    return (
      <button
        type="button"
        onClick={() => requirePro("friend_profile")}
        className="tap-feedback flex w-full items-center justify-center rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3.5 text-sm font-semibold text-amber-400 transition hover:bg-amber-500/20"
      >
        Unlock Compare With Me (Pro)
      </button>
    );
  }

  return (
    <Link
      href={href}
      className="tap-feedback flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
    >
      Compare With Me
    </Link>
  );
}
