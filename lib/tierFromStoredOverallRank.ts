/** Parse tier from stored `profiles.overall_rank` label for `RankBadge` (display only). */
export function tierFromStoredOverallRank(label: string): "I" | "II" | "III" {
  const s = label.trim();
  if (/^goat$/i.test(s)) return "I";
  if (/\bIII\b/i.test(s)) return "III";
  if (/\bII\b/i.test(s)) return "II";
  if (/\bI\b/i.test(s)) return "I";
  return "I";
}
