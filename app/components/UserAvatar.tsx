"use client";

import type { Profile } from "@/lib/types";

type AvatarProfile = Pick<Profile, "username"> | null;

export function UserAvatar({
  profile,
  size = 96,
  className = "",
}: {
  profile: AvatarProfile;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };

  return (
    <div
      className={`profile-avatar flex shrink-0 items-center justify-center bg-zinc-800 text-zinc-300 ring-2 ring-zinc-700/70 ${className}`}
      style={style}
      role="img"
      aria-label={`${profile?.username ?? "User"} default avatar`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={size >= 96 ? "h-12 w-12" : size >= 72 ? "h-10 w-10" : "h-8 w-8"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 19c1.6-3 4.2-4.5 7-4.5s5.4 1.5 7 4.5" />
      </svg>
    </div>
  );
}
