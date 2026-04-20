"use client";

import { Capacitor } from "@capacitor/core";

type RevenueCatPackageId = "$rc_monthly" | "$rc_annual" | "no_ads_monthly";

export type RevenueCatAccessState = {
  hasPro: boolean;
  hasNoAds: boolean;
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
  const hasPro = !!entitlements.pro?.isActive;
  const hasNoAds = hasPro || !!entitlements.no_ads?.isActive;
  return { hasPro, hasNoAds };
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
  const entitlements = result.customerInfo.entitlements.active as Record<
    string,
    { isActive: boolean } | undefined
  >;
  return readEntitlementState(entitlements);
}
