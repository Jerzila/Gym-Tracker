"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { getAffiliateSavedCode } from "@/app/actions/affiliate";
import { getSubscriptionSeed } from "@/app/actions/subscription";
import { ProUpgradePaywall, type ProPlan } from "@/components/paywall/ProUpgradePaywall";
import {
  getPurchaseErrorMessage,
  isNativeCapacitorApp,
  purchaseRevenueCatPackage,
  refreshRevenueCatAccess,
  restoreRevenueCatPurchases,
  type RevenueCatPlanPricing,
  type RevenueCatAccessState,
} from "@/app/lib/purchases/revenueCat";

type ProGateReason =
  | "ffmi"
  | "muscle_rankings"
  | "compare_progress"
  | "improve_rank"
  | "muscle_balance_history"
  | "top_improvements"
  | "advanced_analytics"
  | "monthly_analytics"
  | "calendar"
  | "full_leaderboard"
  | "friend_profile"
  | "muscle_rank_up"
  | "get_pro";

type ProAccessContextValue = {
  ready: boolean;
  hasPro: boolean;
  hasNoAds: boolean;
  monthlyAnalyticsUnlocked: boolean;
  requirePro: (reason: ProGateReason) => boolean;
  refreshAccess: () => Promise<void>;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const PURCHASES_ENABLED = process.env.NEXT_PUBLIC_PURCHASES_ENABLED !== "false";
const FIXED_PRICING: RevenueCatPlanPricing = {
  noAdsMonthly: "€4.99",
  monthly: "€5.99",
  yearly: "€49.99",
};

const ProAccessContext = createContext<ProAccessContextValue | null>(null);

function defaultPaywallPlanForReason(reason: ProGateReason): ProPlan {
  if (reason === "full_leaderboard" || reason === "friend_profile" || reason === "muscle_rankings") {
    return "yearly";
  }
  return "monthly";
}

function computeMonthlyUnlock(profileCreatedAt: string | null, hasPro: boolean): boolean {
  if (hasPro) return true;
  if (!profileCreatedAt) return false;
  const createdAtMs = Date.parse(profileCreatedAt);
  if (!Number.isFinite(createdAtMs)) return false;
  return Date.now() - createdAtMs <= THIRTY_DAYS_MS;
}

function mapPlanToPackage(plan: ProPlan): "$rc_monthly" | "$rc_annual" | "no_ads_monthly" {
  if (plan === "yearly") return "$rc_annual";
  if (plan === "noAds") return "no_ads_monthly";
  return "$rc_monthly";
}

export function ProAccessProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileCreatedAt, setProfileCreatedAt] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [accessState, setAccessState] = useState<RevenueCatAccessState>({ hasPro: false, hasNoAds: false });
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallPlan, setPaywallPlan] = useState<ProPlan>("monthly");
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseNotice, setPurchaseNotice] = useState<string | null>(null);
  const [pricing] = useState<RevenueCatPlanPricing>(FIXED_PRICING);
  const [welcomeNotice, setWelcomeNotice] = useState<string | null>(null);
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);

  const refreshAccess = useCallback(async () => {
    if (!userId) return;
    try {
      const next = await refreshRevenueCatAccess(userId);
      setAccessState(next);
    } catch (error) {
      console.error("[pro] Failed to refresh RevenueCat access", error);
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seed = await getSubscriptionSeed();
      if (cancelled) return;
      setUserId(seed.userId);
      setProfileCreatedAt(seed.profileCreatedAt);
      setDisplayName(seed.displayName);
      setAffiliateCode(seed.affiliateCode);
      if (seed.userId) {
        try {
          const next = await refreshRevenueCatAccess(seed.userId);
          if (!cancelled) setAccessState(next);
        } catch (error) {
          console.error("[pro] Initial RevenueCat sync failed", error);
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const requirePro = useCallback(
    (reason: ProGateReason) => {
      if (accessState.hasPro) return true;
      setPaywallPlan(defaultPaywallPlanForReason(reason));
      setPurchaseNotice(null);
      setPaywallOpen(true);
      return false;
    },
    [accessState.hasPro]
  );

  const handlePaywallPurchase = useCallback(
    async (plan: ProPlan) => {
      if (!userId) return;
      if (!PURCHASES_ENABLED || !isNativeCapacitorApp()) {
        setPurchaseNotice("Purchases will be available once the iOS app is live on the App Store.");
        return;
      }
      setPurchaseNotice(null);
      setPurchaseLoading(true);
      try {
        const packageId = mapPlanToPackage(plan);
        const next = await purchaseRevenueCatPackage(userId, packageId);
        const hasUnlocked = next.hasPro;
        if (!hasUnlocked) {
          setPurchaseNotice("Purchase completed but entitlement is still syncing. Please tap Restore Purchases.");
          return;
        }
        setAccessState(next);
        setPaywallOpen(false);
        const label = displayName?.trim() || "Athlete";
        setWelcomeNotice(`Welcome to Pro, ${label}!`);
      } catch (error) {
        console.error("[pro] purchase failed", error);
        setPurchaseNotice(getPurchaseErrorMessage(error));
      } finally {
        setPurchaseLoading(false);
      }
    },
    [displayName, userId]
  );

  useEffect(() => {
    if (!welcomeNotice) return;
    const timer = setTimeout(() => setWelcomeNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [welcomeNotice]);

  const monthlyAnalyticsUnlocked = useMemo(
    () => computeMonthlyUnlock(profileCreatedAt, accessState.hasPro),
    [accessState.hasPro, profileCreatedAt]
  );

  const value = useMemo<ProAccessContextValue>(
    () => ({
      ready,
      hasPro: accessState.hasPro,
      hasNoAds: accessState.hasNoAds,
      monthlyAnalyticsUnlocked,
      requirePro,
      refreshAccess,
    }),
    [ready, accessState.hasPro, accessState.hasNoAds, monthlyAnalyticsUnlocked, requirePro, refreshAccess]
  );

  return (
    <ProAccessContext.Provider value={value}>
      {children}
      {paywallOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[320]">
              <ProUpgradePaywall
                initialPlan={paywallPlan}
                loading={purchaseLoading}
                purchaseNotice={purchaseNotice}
                pricing={pricing}
                savedAffiliateCode={affiliateCode}
                onAffiliateClaimed={async () => {
                  const next = await getAffiliateSavedCode();
                  setAffiliateCode(next);
                }}
                onClose={() => {
                  setPurchaseNotice(null);
                  setPaywallOpen(false);
                  void refreshAccess();
                }}
                onPurchase={handlePaywallPurchase}
              />
            </div>,
            document.body
          )
        : null}
      {welcomeNotice && typeof document !== "undefined"
        ? createPortal(
            <div className="pointer-events-none fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[360] -translate-x-1/2">
              <div className="rounded-xl border border-amber-400/30 bg-zinc-900/95 px-4 py-2.5 text-sm font-semibold text-amber-200 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                {welcomeNotice}
              </div>
            </div>,
            document.body
          )
        : null}
    </ProAccessContext.Provider>
  );
}

export function useProAccess(): ProAccessContextValue {
  const ctx = useContext(ProAccessContext);
  if (!ctx) {
    throw new Error("useProAccess must be used within ProAccessProvider");
  }
  return ctx;
}

export async function restorePurchasesForCurrentUser(userId: string): Promise<RevenueCatAccessState> {
  return restoreRevenueCatPurchases(userId);
}
