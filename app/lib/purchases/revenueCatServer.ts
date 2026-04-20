/**
 * Server-only RevenueCat lookups (secret key). Used for social UI (crown next to Liftly Pro members).
 */

const RC_V1 = "https://api.revenuecat.com/v1";

type RcSubscriberPayload = {
  subscriber?: {
    entitlements?: Record<string, { expires_date?: string | null }>;
  };
};

function parseSubscriberHasActivePro(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const subscriber = (json as RcSubscriberPayload).subscriber;
  const ent = subscriber?.entitlements?.pro;
  if (!ent) return false;
  const exp = ent.expires_date;
  if (exp == null || exp === "") return true;
  const t = Date.parse(String(exp));
  if (!Number.isFinite(t)) return false;
  return t > Date.now();
}

/** Active `pro` entitlement for this Supabase user id (RevenueCat app_user_id). */
export async function revenueCatSubscriberHasActivePro(appUserId: string): Promise<boolean> {
  const key = process.env.REVENUECAT_SECRET_API_KEY?.trim();
  if (!key || !appUserId) return false;
  try {
    const res = await fetch(`${RC_V1}/subscribers/${encodeURIComponent(appUserId)}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const json: unknown = await res.json();
    return parseSubscriberHasActivePro(json);
  } catch {
    return false;
  }
}

export async function revenueCatSubscriberHasActiveProMany(userIds: string[]): Promise<Map<string, boolean>> {
  const unique = [...new Set(userIds.map((id) => String(id || "").trim()).filter(Boolean))];
  const out = new Map<string, boolean>();
  if (unique.length === 0) return out;
  await Promise.all(
    unique.map(async (id) => {
      const v = await revenueCatSubscriberHasActivePro(id);
      out.set(id, v);
    })
  );
  return out;
}
