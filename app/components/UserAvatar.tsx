"use client";

import type { Profile } from "@/lib/types";

type AvatarProfile = Pick<Profile, "avatar_url" | "username"> | null;

export function UserAvatar({
  profile,
  size = 80,
  className = "",
}: {
  profile: AvatarProfile;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };

  if (!profile) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-500 ${className}`}
        style={style}
        aria-hidden
      >
        <span className="text-2xl font-semibold">…</span>
      </div>
    );
  }

  if (profile.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote Supabase URL
      <img
        src={profile.avatar_url}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  const letter = (profile.username?.charAt(0) ?? "?").toUpperCase();
  const fontSize = size >= 72 ? "text-3xl" : size >= 48 ? "text-2xl" : "text-xl";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 ring-2 ring-amber-500/30 ${className}`}
      style={style}
      aria-hidden
    >
      <span className={`font-semibold ${fontSize}`}>{letter}</span>
    </div>
  );
}
