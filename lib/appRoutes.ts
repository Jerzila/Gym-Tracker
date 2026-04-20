/**
 * Product shell lives under `/app` (marketing and public profiles stay at site root).
 */

export const APP_PATH_PREFIX = "/app" as const;

/** Dashboard home inside the app shell. */
export const APP_HOME = `${APP_PATH_PREFIX}` as const;

/**
 * Prefix an in-app path with `/app`.
 * @param path Must start with `/` (e.g. `/calendar`, `/`). Use `/` for dashboard.
 */
export function appHref(path: string): string {
  if (!path.startsWith("/")) {
    return `${APP_PATH_PREFIX}/${path}`;
  }
  if (path === "/") {
    return APP_HOME;
  }
  return `${APP_PATH_PREFIX}${path}`;
}

/** Strip `/app` for comparisons against legacy pathnames (e.g. title map). */
export function stripAppPathPrefix(pathname: string): string {
  if (pathname === APP_PATH_PREFIX || pathname === `${APP_PATH_PREFIX}/`) {
    return "/";
  }
  if (pathname.startsWith(`${APP_PATH_PREFIX}/`)) {
    return pathname.slice(APP_PATH_PREFIX.length);
  }
  return pathname;
}

export function isAppShellPath(pathname: string): boolean {
  return pathname === APP_PATH_PREFIX || pathname.startsWith(`${APP_PATH_PREFIX}/`);
}

const ROOT_POST_AUTH_ALLOWLIST = new Set(["/privacy", "/terms", "/landing"]);

/**
 * After sign-in, only send users to `/app…`, site-root legal/marketing, or public profile URLs.
 */
export function normalizeAuthRedirect(redirectTo: string): string {
  const raw = redirectTo.trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return APP_HOME;
  }
  if (raw === "/") {
    return APP_HOME;
  }
  if (raw === APP_HOME || raw.startsWith(`${APP_PATH_PREFIX}/`)) {
    return raw;
  }
  if (ROOT_POST_AUTH_ALLOWLIST.has(raw) || raw.startsWith("/u/") || raw.startsWith("/user/")) {
    return raw;
  }
  return appHref(raw);
}
