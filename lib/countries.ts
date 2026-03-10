/** Full ISO 3166-1 alpha-2 country list (sorted by name). */
import countriesData from "./countries-data.json";

export const COUNTRIES: { code: string; name: string }[] = countriesData as {
  code: string;
  name: string;
}[];

/** Regional indicator symbols from ISO 3166-1 alpha-2 (e.g. US -> 🇺🇸). */
export function getFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return "";
  const a = code.toUpperCase();
  return [...a]
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}
