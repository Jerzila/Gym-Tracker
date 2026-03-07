/**
 * Compute current age in full years from a birthday string (YYYY-MM-DD).
 * Returns null if birthday is missing or invalid.
 */
export function getAgeFromBirthday(birthday: string | null | undefined): number | null {
  if (!birthday || typeof birthday !== "string") return null;
  const d = new Date(birthday);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const monthDiff = today.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

/**
 * Human-readable current age for display, e.g. "28 years old" or "28".
 */
export function formatCurrentAge(birthday: string | null | undefined): string | null {
  const age = getAgeFromBirthday(birthday);
  if (age === null) return null;
  return `${age} ${age === 1 ? "year" : "years"} old`;
}
