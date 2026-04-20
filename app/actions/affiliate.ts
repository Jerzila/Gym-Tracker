"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function mapRpcError(code: string | undefined): string {
  switch (code) {
    case "not_authenticated":
      return "Sign in to add a partner code.";
    case "empty":
      return "Enter a code or skip.";
    case "invalid_format":
      return "That code doesn’t look valid.";
    case "invalid_code":
      return "We don’t recognize that code.";
    case "invalid_code_unchanged":
      return "We don’t recognize that code. Your saved partner code is unchanged.";
    default:
      return "Couldn’t save the code. Try again.";
  }
}

export type ClaimAffiliateResult =
  | { ok: true }
  | { ok: false; error: string; rpcError?: string };

/** Current saved partner code, or null if none. */
export async function getAffiliateSavedCode(): Promise<string | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("affiliate_user_claims")
    .select("affiliate_code")
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.affiliate_code ?? null;
}

/**
 * Optional attribution only: validates against `affiliates` and inserts `affiliate_user_claims`.
 * Does not affect purchases or RevenueCat.
 */
export async function claimAffiliateCode(raw: string): Promise<ClaimAffiliateResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mapRpcError("not_authenticated") };
  }

  const { data, error } = await supabase.rpc("claim_affiliate_code", { p_raw: raw });

  if (error) {
    console.error("[affiliate] claimAffiliateCode rpc failed", error);
    return { ok: false, error: "Something went wrong." };
  }

  const row = data as { ok?: boolean; error?: string } | null;
  if (!row || row.ok !== true) {
    const rpcError = row?.error;
    return { ok: false, error: mapRpcError(rpcError), rpcError };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
