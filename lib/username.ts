const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

/** Normalize user-facing input to stored lowercase username. */
export function normalizeUsernameInput(raw: string): string {
  return raw.trim().toLowerCase();
}

/** True if `value` looks like a UUID (for `/user/{id}` vs handle). */
export function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

export function validateUsernameFormat(username: string): string | undefined {
  const u = normalizeUsernameInput(username);
  if (u.length < 3 || u.length > 20) {
    return "Username must be 3–20 characters.";
  }
  if (!USERNAME_PATTERN.test(u)) {
    return "Use only letters, numbers, and underscores.";
  }
  return undefined;
}

/**
 * Base slug from display name for auto-assigned usernames (first app load / onboarding).
 * Ensures at least 3 characters when possible.
 */
export function baseUsernameFromName(name: string | null | undefined): string {
  const cleaned = (name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  if (cleaned.length >= 3) return cleaned.slice(0, 20);
  if (cleaned.length > 0) {
    const padded = (cleaned + "usr").slice(0, 20);
    if (padded.length >= 3) return padded;
  }
  return "user";
}

/** Build candidate `base`, `base1`, `base2`, … staying within 20 chars. */
export function candidateUsername(base: string, index: number): string {
  const suffix = index === 0 ? "" : String(index);
  const maxBaseLen = Math.max(1, 20 - suffix.length);
  const truncated = base.slice(0, maxBaseLen).toLowerCase();
  return `${truncated}${suffix}`;
}

const USERNAME_CHANGE_COOLDOWN_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Manual username changes: at most once per 7 days after the first user-initiated save. */
export function getUsernameChangeCooldownState(
  usernameLastChangedAt: string | null | undefined
): { canChange: boolean; daysRemaining: number | null } {
  if (!usernameLastChangedAt) {
    return { canChange: true, daysRemaining: null };
  }
  const diffDays =
    (Date.now() - new Date(usernameLastChangedAt).getTime()) / MS_PER_DAY;
  if (diffDays >= USERNAME_CHANGE_COOLDOWN_DAYS) {
    return { canChange: true, daysRemaining: null };
  }
  return {
    canChange: false,
    daysRemaining: Math.ceil(USERNAME_CHANGE_COOLDOWN_DAYS - diffDays),
  };
}

/** Server + client copy when a username change is blocked by the 7-day cooldown. */
export const USERNAME_CHANGE_COOLDOWN_ERROR_MESSAGE =
  "You can only change your username once every 7 days.";
