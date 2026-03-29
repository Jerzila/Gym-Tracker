"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { removeFriend } from "@/app/actions/social";

type Props = {
  friendId: string;
  username: string;
  onRemoved?: (friendId: string) => void;
};

export function FriendListRowWithMenu({ friendId, username, onRemoved }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function handleRemove() {
    setBusy(true);
    const res = await removeFriend(friendId);
    setBusy(false);
    setOpen(false);
    if (res.ok) onRemoved?.(friendId);
  }

  return (
    <div
      ref={rootRef}
      className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2"
    >
      <Link
        href={`/friend/${friendId}`}
        className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100 transition-colors hover:text-white tap-feedback"
      >
        {username}
      </Link>
      <div className="relative shrink-0">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-lg leading-none text-zinc-400 transition-colors hover:bg-zinc-800/80 hover:text-zinc-100 tap-feedback"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Friend options"
          onClick={(e) => {
            e.preventDefault();
            setOpen((o) => !o);
          }}
        >
          ⋯
        </button>
        {open ? (
          <div
            className="absolute right-0 top-full z-30 mt-1 min-w-[10rem] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 py-1 shadow-xl"
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              className="block w-full px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-zinc-900 disabled:opacity-50"
              onClick={() => void handleRemove()}
            >
              Remove Friend
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
