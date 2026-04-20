import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { APP_PATH_PREFIX } from "@/lib/appRoutes";

/** First segments that used to live at site root before the `/app` shell. */
const LEGACY_APP_SEGMENTS = new Set([
  "login",
  "signup",
  "forgot-password",
  "reset-password",
  "verify-email",
  "calendar",
  "insights",
  "exercises",
  "account",
  "social",
  "bodyweight",
  "categories",
  "profile-setup",
  "dev",
  "friend",
  "exercise",
  "~offline",
]);

function shouldRedirectLegacyToApp(pathname: string): boolean {
  if (pathname === APP_PATH_PREFIX || pathname.startsWith(`${APP_PATH_PREFIX}/`)) {
    return false;
  }
  const seg = pathname.split("/")[1];
  if (!seg) return false;
  return LEGACY_APP_SEGMENTS.has(seg);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/landing") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 308);
  }

  if (shouldRedirectLegacyToApp(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `${APP_PATH_PREFIX}${pathname}`;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
