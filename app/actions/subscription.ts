"use server";

import { createServerClient } from "@/lib/supabase/server";

export type SubscriptionSeed = {
  userId: string | null;
  profileCreatedAt: string | null;
  /** Saved partner code text, or null if none. */
  affiliateCode: string | null;
};

/** Earliest known signup time for trials (profile row vs auth user). */
function mergeAccountCreatedAt(
  profileRowCreatedAt: string | null | undefined,
  authUserCreatedAt: string | undefined
): string | null {
  const a = profileRowCreatedAt ? Date.parse(profileRowCreatedAt) : NaN;
  const b = authUserCreatedAt ? Date.parse(authUserCreatedAt) : NaN;
  const finite = [a, b].filter((n) => Number.isFinite(n)) as number[];
  if (finite.length === 0) return null;
  return new Date(Math.min(...finite)).toISOString();
}

export async function getSubscriptionSeed(): Promise<SubscriptionSeed> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, profileCreatedAt: null, affiliateCode: null };
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("id", user.id)
    .maybeSingle();

  const { data: claimRow } = await supabase
    .from("affiliate_user_claims")
    .select("affiliate_code")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    profileCreatedAt: mergeAccountCreatedAt(profileRow?.created_at ?? null, user.created_at),
    affiliateCode: claimRow?.affiliate_code ?? null,
  };
}
