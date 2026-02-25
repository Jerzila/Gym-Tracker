import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
  const anonKey =
    (
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    )?.trim() ?? "";

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
    );
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error(
      "Invalid NEXT_PUBLIC_SUPABASE_URL: must start with https:// (e.g. https://your-project.supabase.co)"
    );
  }
  return { url, key: anonKey };
}

/**
 * Server Supabase client with cookie-based session.
 * Use for Server Components, Server Actions, Route Handlers.
 * RLS applies per authenticated user.
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseConfig();

  return createSupabaseServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll from Server Component can be ignored when middleware refreshes sessions
        }
      },
    },
  });
}
