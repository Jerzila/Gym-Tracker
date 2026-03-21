"use client";

import Link from "next/link";
import type { Profile } from "@/lib/types";
import { UserAvatar } from "@/app/components/UserAvatar";
import { useUsernameDisplay } from "@/app/components/UsernameDisplayContext";

const editProfileButtonClass =
  "mt-4 inline-flex w-full max-w-[240px] items-center justify-center rounded-xl border-2 border-amber-500 bg-transparent px-6 py-3 text-sm font-semibold text-amber-500 transition-colors hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export function AccountHeroSection({ profile }: { profile: Profile | null }) {
  const usernameCtx = useUsernameDisplay();
  const handle = usernameCtx?.username ?? profile?.username ?? null;

  return (
    <section className="flex flex-col items-center px-2 pt-2">
      <UserAvatar profile={profile} size={80} />
      <p className="mt-4 text-center text-lg font-medium tracking-tight text-zinc-100">
        {handle ? (
          <>
            @<span className="tabular-nums">{handle}</span>
          </>
        ) : (
          <span className="text-zinc-500">Setting up profile…</span>
        )}
      </p>
      <Link href="/account/edit-profile" className={editProfileButtonClass}>
        Edit Profile
      </Link>
    </section>
  );
}
