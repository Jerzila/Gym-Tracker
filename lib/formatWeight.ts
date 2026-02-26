/**
 * Format a weight value for display: round to 1 decimal place and preserve sign.
 * Use for absolute weights (e.g. "72.5 kg") or for change values (with signed option).
 */
export function formatWeight(value: number, options?: { signed?: boolean }): string {
  const rounded = Math.round(value * 10) / 10;
  const str = rounded.toFixed(1);
  if (options?.signed && rounded > 0) {
    return `+${str}`;
  }
  return str;
}
