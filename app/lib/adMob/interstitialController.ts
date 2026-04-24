import { isNativeCapacitorApp } from "@/app/lib/purchases/revenueCat";
import {
  isAdMobTestMode,
  resolveInterstitialAdUnitIdForCurrentPlatform,
} from "@/app/lib/adMob/adMobConfig";

const COOLDOWN_MS = 60_000;
const EVENTS_PER_INTERSTITIAL = 3;
const MAX_INTERSTITIALS_PER_SESSION = 5;
const STORAGE_LAST_SHOWN = "liftly_admob_last_shown_ms";
const STORAGE_EVENT_COUNT = "liftly_admob_event_count";
const STORAGE_SESSION_IMPRESSIONS = "liftly_admob_session_impressions";

function canShowByCooldown(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_LAST_SHOWN);
    if (!raw) return true;
    const last = Number(raw);
    if (!Number.isFinite(last)) return true;
    return Date.now() - last >= COOLDOWN_MS;
  } catch {
    return true;
  }
}

function readFiniteNumber(raw: string | null, fallback = 0): number {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function consumeMeaningfulEventThirdRule(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const next = readFiniteNumber(window.localStorage.getItem(STORAGE_EVENT_COUNT), 0) + 1;
    window.localStorage.setItem(STORAGE_EVENT_COUNT, String(next));
    return next > 0 && next % EVENTS_PER_INTERSTITIAL === 0;
  } catch {
    return false;
  }
}

function canShowBySessionCap(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const impressions = readFiniteNumber(window.sessionStorage.getItem(STORAGE_SESSION_IMPRESSIONS), 0);
    return impressions < MAX_INTERSTITIALS_PER_SESSION;
  } catch {
    return true;
  }
}

function recordInterstitialShown(): void {
  try {
    window.localStorage.setItem(STORAGE_LAST_SHOWN, String(Date.now()));
  } catch {
    /* ignore */
  }
  try {
    const next = readFiniteNumber(window.sessionStorage.getItem(STORAGE_SESSION_IMPRESSIONS), 0) + 1;
    window.sessionStorage.setItem(STORAGE_SESSION_IMPRESSIONS, String(next));
  } catch {
    /* ignore */
  }
}

let interstitialBusy = false;

/** Avoids double-counting exercise opens under React Strict Mode (dev). */
const exerciseOpenDedupe = new Set<string>();

export function consumeExerciseOpenDedupe(exerciseId: string): boolean {
  if (exerciseOpenDedupe.has(exerciseId)) return false;
  exerciseOpenDedupe.add(exerciseId);
  queueMicrotask(() => {
    exerciseOpenDedupe.delete(exerciseId);
  });
  return true;
}

export async function prepareInterstitialPrefetch(): Promise<void> {
  if (!isNativeCapacitorApp()) return;
  const adId = resolveInterstitialAdUnitIdForCurrentPlatform();
  if (!adId) return;
  const isTesting = isAdMobTestMode();
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.prepareInterstitial({ adId, isTesting });
  } catch (e) {
    console.warn("[admob] prepareInterstitial prefetch failed", e);
  }
}

/**
 * Free-tier policy: every 3rd meaningful event, 60s cooldown, max 5 interstitials per app session.
 */
export async function maybeShowInterstitialAfterExerciseOpen(hasNoAds: boolean): Promise<void> {
  await maybeShowInterstitialAfterMeaningfulEvent(hasNoAds, "exercise_open");
}

/**
 * Trigger after workout log success.
 */
export async function maybeShowInterstitialAfterWorkoutLog(hasNoAds: boolean): Promise<void> {
  await maybeShowInterstitialAfterMeaningfulEvent(hasNoAds, "after_workout_log");
}

/** Trigger after bodyweight log success. */
export async function maybeShowInterstitialAfterBodyweightLog(hasNoAds: boolean): Promise<void> {
  await maybeShowInterstitialAfterMeaningfulEvent(hasNoAds, "after_bodyweight_log");
}

/** Trigger after sending a friend request successfully. */
export async function maybeShowInterstitialAfterFriendAdd(hasNoAds: boolean): Promise<void> {
  await maybeShowInterstitialAfterMeaningfulEvent(hasNoAds, "after_friend_add");
}

async function maybeShowInterstitialAfterMeaningfulEvent(
  hasNoAds: boolean,
  reason: "exercise_open" | "after_workout_log" | "after_bodyweight_log" | "after_friend_add"
): Promise<void> {
  if (hasNoAds || !isNativeCapacitorApp()) return;
  const adId = resolveInterstitialAdUnitIdForCurrentPlatform();
  if (!adId) return;
  if (!consumeMeaningfulEventThirdRule()) return;
  if (!canShowByCooldown()) return;
  if (!canShowBySessionCap()) return;
  await runInterstitialShow(reason, adId);
}

async function runInterstitialShow(
  _reason: "exercise_open" | "after_workout_log" | "after_bodyweight_log" | "after_friend_add",
  adId: string
): Promise<void> {
  if (interstitialBusy) return;
  interstitialBusy = true;
  const isTesting = isAdMobTestMode();
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.prepareInterstitial({ adId, isTesting });
    await AdMob.showInterstitial();
    recordInterstitialShown();
  } catch (e) {
    console.warn("[admob] interstitial show failed", e);
  } finally {
    interstitialBusy = false;
  }
}
