import { Capacitor } from "@capacitor/core";

export type RestorePurchasesResult = {
  foundPurchases: boolean;
  message: string;
};

export async function runRestorePurchasesCheck(): Promise<RestorePurchasesResult> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return {
        foundPurchases: false,
        message: "Restore purchases is only available in the Liftly iOS app (same Apple ID as the original purchase).",
      };
    }

    const { getSubscriptionSeed } = await import("@/app/actions/subscription");
    const { restoreRevenueCatPurchases } = await import("@/app/lib/purchases/revenueCat");
    const seed = await getSubscriptionSeed();
    if (!seed.userId) {
      return {
        foundPurchases: false,
        message: "Please sign in before restoring purchases.",
      };
    }
    const state = await restoreRevenueCatPurchases(seed.userId);
    return {
      foundPurchases: state.hasPro || state.hasNoAds,
      message:
        state.hasPro || state.hasNoAds
          ? "Your purchases were restored successfully."
          : "No purchases were found for this Apple ID.",
    };
  } catch (err) {
    console.error("[purchases] runRestorePurchasesCheck failed", err);
    throw err;
  }
}
