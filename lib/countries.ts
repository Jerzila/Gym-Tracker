/** Full ISO 3166-1 alpha-2 country list (sorted by name). */
import countriesData from "./countries-data.json";

export const COUNTRIES: { code: string; name: string }[] = countriesData as {
  code: string;
  name: string;
}[];
