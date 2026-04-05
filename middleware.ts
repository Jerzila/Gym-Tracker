import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const authPaths = ["/login", "/signup", "/forgot-password", "/reset-password"];
const verificationPath = "/verify-email";

/** Marketing and other routes that never require a session (same idea as auth pages). */
const publicMarketingPaths = ["/landing"];

function isPublicMarketingPath(pathname: string): boolean {
  return publicMarketingPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isProtectedPath(pathname: string): boolean {
  if (isPublicMarketingPath(pathname)) return false;
  if (pathname === "/" || pathname === "/bodyweight" || pathname === "/categories") return true;
  if (pathname === "/profile-setup" || pathname.startsWith("/account")) return true;
  if (pathname === "/exercises" || pathname === "/calendar" || pathname === "/insights") return true;
  if (pathname.startsWith("/exercise/")) return true;
  return false;
}

function isAuthPath(pathname: string): boolean {
  return authPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isVerificationPath(pathname: string): boolean {
  return pathname === verificationPath || pathname.startsWith(`${verificationPath}/`);
}

function buildVerifyEmailUrl(request: NextRequest, email: string | null, next: string): URL {
  const url = new URL(verificationPath, request.url);
  if (email) url.searchParams.set("email", email);
  url.searchParams.set("next", next);
  return url;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim();
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !user.email_confirmed_at && !isVerificationPath(request.nextUrl.pathname)) {
    const next = request.nextUrl.pathname;
    if (isProtectedPath(request.nextUrl.pathname)) {
      return NextResponse.redirect(buildVerifyEmailUrl(request, user.email ?? null, next));
    }
    if (isAuthPath(request.nextUrl.pathname)) {
      const redirectTo = request.nextUrl.searchParams.get("redirect") || "/";
      return NextResponse.redirect(buildVerifyEmailUrl(request, user.email ?? null, redirectTo));
    }
  }

  if (isProtectedPath(request.nextUrl.pathname)) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isAuthPath(request.nextUrl.pathname) && user) {
    const redirectTo = request.nextUrl.searchParams.get("redirect") || "/";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
