import { Capacitor } from "@capacitor/core";

/** Google sample IDs — use with NEXT_PUBLIC_ADMOB_USE_TEST_ADS=1 during development. */
export const ADMOB_TEST_IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511";
export const ADMOB_TEST_IOS_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/4411468910";

/** Production iOS (Liftly). Android: set env when you add the Android app in AdMob. */
const DEFAULT_IOS_APP_ID = "ca-app-pub-6904443125669508~5438781706";
const DEFAULT_IOS_INTERSTITIAL_ID = "ca-app-pub-6904443125669508/7873373350";

export function isAdMobTestMode(): boolean {
  return process.env.NEXT_PUBLIC_ADMOB_USE_TEST_ADS === "1";
}

export function resolveIosInterstitialAdUnitId(): string {
  if (isAdMobTestMode()) {
    return ADMOB_TEST_IOS_INTERSTITIAL_ID;
  }
  return process.env.NEXT_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID?.trim() || DEFAULT_IOS_INTERSTITIAL_ID;
}

/** Reserved for Android — wire NEXT_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID when ready. */
export function resolveAndroidInterstitialAdUnitId(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID?.trim();
  if (fromEnv) return fromEnv;
  return null;
}

export function resolveInterstitialAdUnitIdForCurrentPlatform(): string | null {
  const p = Capacitor.getPlatform();
  if (p === "ios") return resolveIosInterstitialAdUnitId();
  if (p === "android") return resolveAndroidInterstitialAdUnitId();
  return null;
}
