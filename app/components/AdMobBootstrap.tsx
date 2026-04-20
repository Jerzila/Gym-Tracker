"use client";

import { useEffect, useRef } from "react";
import { isNativeCapacitorApp } from "@/app/lib/purchases/revenueCat";
import { prepareInterstitialPrefetch } from "@/app/lib/adMob/interstitialController";

/**
 * Initializes AdMob once on native iOS/Android, runs ATT + UMP consent, and prefetches interstitials after dismiss.
 */
export function AdMobBootstrap() {
  const listenersReady = useRef(false);

  useEffect(() => {
    if (!isNativeCapacitorApp()) return;

    let cancelled = false;

    void (async () => {
      const {
        AdMob,
        AdmobConsentStatus,
        InterstitialAdPluginEvents,
      } = await import("@capacitor-community/admob");

      if (cancelled) return;

      try {
        await AdMob.initialize();
      } catch (e) {
        console.warn("[admob] initialize failed", e);
        return;
      }

      if (cancelled) return;

      try {
        const trackingInfo = await AdMob.trackingAuthorizationStatus();
        if (trackingInfo.status === "notDetermined") {
          await AdMob.requestTrackingAuthorization();
        }
      } catch (e) {
        console.warn("[admob] tracking authorization failed", e);
      }

      if (cancelled) return;

      try {
        let consentInfo = await AdMob.requestConsentInfo();
        if (
          consentInfo.status === AdmobConsentStatus.REQUIRED &&
          consentInfo.isConsentFormAvailable
        ) {
          consentInfo = await AdMob.showConsentForm();
        }
        if (consentInfo.canRequestAds === false) {
          return;
        }
      } catch (e) {
        console.warn("[admob] consent flow failed", e);
      }

      if (cancelled) return;

      if (!listenersReady.current) {
        listenersReady.current = true;
        void AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          void prepareInterstitialPrefetch();
        });
      }

      void prepareInterstitialPrefetch();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
