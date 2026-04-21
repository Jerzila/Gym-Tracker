"use client";

import { Capacitor } from "@capacitor/core";

type RevenueCatPackageId = "$rc_monthly" | "$rc_annual" | "no_ads_monthly";

export type RevenueCatAccessState = {
  hasPro: boolean;
  hasNoAds: boolean;
};

export type RevenueCatPlanPricing = {
  noAdsMonthly: string | null;
  monthly: string | null;
  yearly: string | null;
};

let configuredForUserId: string | null = null;

const PUBLIC_SDK_KEY =
  process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY ?? "appl_FizDGsnvHwAuYANIhadyJgxTeOd";

async function getPurchasesModule() {
  return import("@revenuecat/purchases-capacitor");
}

export function isNativeCapacitorApp(): boolean {
  return Capacitor.isNativePlatform();
}

function readEntitlementState(entitlements: Record<string, { isActive: boolean } | undefined>): RevenueCatAccessState {
  const activeKeys = Object.entries(entitlements)
    .filter(([, value]) => !!value?.isActive)
    .map(([key]) => key.toLowerCase());

  const hasCorePro =
    activeKeys.includes("pro") ||
    activeKeys.includes("premium") ||
    activeKeys.some((key) => key.includes("pro") && !key.includes("no_ads"));
  const hasNoAds = hasCorePro || activeKeys.includes("no_ads") || activeKeys.some((key) => key.includes("no_ads"));
  // Product decision: any paid plan in this paywall should grant Pro access.
  const hasPro = hasCorePro || hasNoAds;
  return { hasPro, hasNoAds };
}

function pricingFromOfferings(offerings: unknown): RevenueCatPlanPricing {
  const current = (offerings as { current?: { availablePackages?: unknown[] } } | null)?.current;
  const availablePackages = current?.availablePackages ?? [];

  const pricing: RevenueCatPlanPricing = {
    noAdsMonthly: null,
    monthly: null,
    yearly: null,
  };

  for (const pkg of availablePackages) {
    const cast = pkg as { identifier?: string; product?: { priceString?: string } };
    const identifier = cast.identifier;
    const priceString = cast.product?.priceString ?? null;
    if (!identifier || !priceString) continue;
    if (identifier === "no_ads_monthly") pricing.noAdsMonthly = priceString;
    if (identifier === "$rc_monthly") pricing.monthly = priceString;
    if (identifier === "$rc_annual") pricing.yearly = priceString;
  }

  return pricing;
}

export async function configureRevenueCat(appUserId: string): Promise<void> {
  if (!isNativeCapacitorApp()) return;
  if (!PUBLIC_SDK_KEY) throw new Error("Missing RevenueCat public SDK key.");

  const { Purchases } = await getPurchasesModule();
  if (configuredForUserId === appUserId) return;

  await Purchases.configure({
    apiKey: PUBLIC_SDK_KEY,
    appUserID: appUserId,
  });
  configuredForUserId = appUserId;
}

export async function getRevenueCatPlanPricing(appUserId: string): Promise<RevenueCatPlanPricing> {
  if (!isNativeCapacitorApp()) {
    return { noAdsMonthly: null, monthly: null, yearly: null };
  }

  await configureRevenueCat(appUserId);
  const { Purchases } = await getPurchasesModule();
  const offerings = await Purchases.getOfferings();
  return pricingFromOfferings(offerings);
}

export async function refreshRevenueCatAccess(appUserId: string): Promise<RevenueCatAccessState> {
  if (!isNativeCapacitorApp()) {
    return { hasPro: false, hasNoAds: false };
  }

  await configureRevenueCat(appUserId);
  const { Purchases } = await getPurchasesModule();
  const info = await Purchases.getCustomerInfo();
  const entitlements = info.customerInfo.entitlements.active as Record<string, { isActive: boolean } | undefined>;
  return readEntitlementState(entitlements);
}

export async function restoreRevenueCatPurchases(appUserId: string): Promise<RevenueCatAccessState> {
  if (!isNativeCapacitorApp()) {
    return { hasPro: false, hasNoAds: false };
  }

  await configureRevenueCat(appUserId);
  const { Purchases } = await getPurchasesModule();
  const info = await Purchases.restorePurchases();
  const entitlements = info.customerInfo.entitlements.active as Record<string, { isActive: boolean } | undefined>;
  return readEntitlementState(entitlements);
}

export async function purchaseRevenueCatPackage(
  appUserId: string,
  packageId: RevenueCatPackageId
): Promise<RevenueCatAccessState> {
  if (!isNativeCapacitorApp()) {
    throw new Error("Purchases are only available in the native iOS app.");
  }

  await configureRevenueCat(appUserId);
  const { Purchases } = await getPurchasesModule();
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) throw new Error("No active offering is available.");

  const target = current.availablePackages.find((pkg) => pkg.identifier === packageId);
  if (!target) throw new Error("Selected package is not available.");

  const result = await Purchases.purchasePackage({ aPackage: target });
  const initialEntitlements = result.customerInfo.entitlements.active as Record<
    string,
    { isActive: boolean } | undefined
  >;
  const initial = readEntitlementState(initialEntitlements);
  if (initial.hasPro || initial.hasNoAds) return initial;

  // Some devices can briefly return stale customer info right after purchase.
  const refreshed = await Purchases.getCustomerInfo();
  const refreshedEntitlements = refreshed.customerInfo.entitlements.active as Record<
    string,
    { isActive: boolean } | undefined
  >;
  const refreshedState = readEntitlementState(refreshedEntitlements);
  if (refreshedState.hasPro || refreshedState.hasNoAds) return refreshedState;

  // Last attempt: restore reconciles receipts in some sandbox/TestFlight edge cases.
  const restored = await Purchases.restorePurchases();
  const restoredEntitlements = restored.customerInfo.entitlements.active as Record<
    string,
    { isActive: boolean } | undefined
  >;
  const restoredState = readEntitlementState(restoredEntitlements);
  if (restoredState.hasPro || restoredState.hasNoAds) return restoredState;

  throw new Error("Purchase completed but entitlement is not active yet. Please tap Restore purchases.");
}

export function getPurchaseErrorMessage(error: unknown): string {
  if (typeof error === "object" && error) {
    const candidate = error as {
      userCancelled?: boolean;
      message?: unknown;
      code?: unknown;
      readableErrorCode?: unknown;
    };
    if (candidate.userCancelled) return "Purchase cancelled.";
    const message = typeof candidate.message === "string" ? candidate.message : "";
    const combined = `${String(candidate.code ?? "")} ${String(candidate.readableErrorCode ?? "")} ${message}`.toLowerCase();
    if (combined.includes("cancel")) return "Purchase cancelled.";
    if (message.trim()) return message;
  }
  return "Purchase is currently unavailable. Please try again shortly.";
}
