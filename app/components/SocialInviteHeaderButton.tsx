"use client";

import { Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getProfile } from "@/app/actions/profile";
import { Button } from "@/app/components/Button";
import { buildProfileInviteUrl } from "@/lib/publicAppOrigin";

/**
 * Header control for /social: opens invite link panel (positioned next to the “Social” title via shell layout).
 */
export function SocialInviteHeaderButton() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<{ userId: string; username: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getProfile().then((p) => {
      if (cancelled || !p) return;
      setPayload({ userId: p.id, username: p.username });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  const link = payload ? buildProfileInviteUrl({ userId: payload.userId, username: payload.username }) : "";

  const onCopy = useCallback(async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [link]);

  if (!payload) return null;

  const overlay =
    open && typeof document !== "undefined"
      ? createPortal(
          <>
            <div className="fixed inset-0 z-[215] bg-black/50" aria-hidden />
            <div
              ref={panelRef}
              className="fixed left-1/2 z-[220] w-[min(100vw-2rem,36rem)] -translate-x-1/2 rounded-b-xl border border-t-0 border-zinc-800 bg-zinc-950 p-4 shadow-2xl"
              style={{ top: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
              role="dialog"
              aria-label="Invite friend"
            >
              <p className="text-xs leading-relaxed text-zinc-500">
                Copy your link. They open your profile and can send a friend request.
              </p>
              <p className="mt-3 break-all rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-3 py-2 font-mono text-[11px] text-zinc-400">
                {link}
              </p>
              <div className="mt-3">
                <Button type="button" variant="primary" size="sm" onClick={onCopy}>
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <div className="relative flex shrink-0 items-center">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className={`tap-feedback rounded-lg p-2 transition hover:bg-zinc-900 ${
          open ? "text-amber-400" : "text-zinc-300 hover:text-zinc-100"
        }`}
        aria-label={open ? "Close invite" : "Invite friend"}
      >
        <Share2 className="h-5 w-5" aria-hidden strokeWidth={2} />
      </button>
      {overlay}
    </div>
  );
}
