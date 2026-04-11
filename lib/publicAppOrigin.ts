/**
 * Canonical HTTPS origin for shareable profile links (invite links).
 * Override with NEXT_PUBLIC_APP_ORIGIN in env (no trailing slash).
 */
export function getPublicProfileLinkOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  if (raw) {
    return raw.replace(/\/+$/, "");
  }
  return "https://liftlygym.com";
}

export function buildProfileInviteUrl(opts: { userId: string; username: string | null }): string {
  const base = getPublicProfileLinkOrigin();
  const u = (opts.username ?? "").trim();
  if (u.length >= 3) {
    return `${base}/u/${encodeURIComponent(u)}`;
  }
  return `${base}/user/${encodeURIComponent(opts.userId)}`;
}
