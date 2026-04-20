import { isNativeCapacitorApp } from "@/app/lib/purchases/revenueCat";
import {
  resolveInterstitialAdUnitIdForCurrentPlatform,
  useAdMobTestMode,
} from "@/app/lib/adMob/adMobConfig";

const COOLDOWN_MS = 90_000;
const STORAGE_LAST_SHOWN = "liftly_admob_last_shown_ms";
const STORAGE_DAILY_OPENS = "liftly_admob_daily_exercise_opens";

function localDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readDailyOpenState(): { date: string; count: number } {
  if (typeof window === "undefined") return { date: localDateKey(), count: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_DAILY_OPENS);
    if (!raw) return { date: localDateKey(), count: 0 };
    const parsed = JSON.parse(raw) as { date?: string; count?: number };
    const date = typeof parsed.date === "string" ? parsed.date : localDateKey();
    const count = typeof parsed.count === "number" && Number.isFinite(parsed.count) ? parsed.count : 0;
    return { date, count };
  } catch {
    return { date: localDateKey(), count: 0 };
  }
}

function writeDailyOpenState(state: { date: string; count: number }): void {
  try {
    window.localStorage.setItem(STORAGE_DAILY_OPENS, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/**
 * Increments today's exercise-open count and returns whether this open is the 3rd, 6th, … of the day.
 */
export function recordExerciseOpenForDailyThirdRule(): boolean {
  if (typeof window === "undefined") return false;
  const key = localDateKey();
  let { date, count } = readDailyOpenState();
  if (date !== key) {
    date = key;
    count = 0;
  }
  count += 1;
  writeDailyOpenState({ date, count });
  return count > 0 && count % 3 === 0;
}

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

function recordInterstitialShown(): void {
  try {
    window.localStorage.setItem(STORAGE_LAST_SHOWN, String(Date.now()));
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
  const isTesting = useAdMobTestMode();
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.prepareInterstitial({ adId, isTesting });
  } catch (e) {
    console.warn("[admob] prepareInterstitial prefetch failed", e);
  }
}

/**
 * After every 3rd exercise screen open today (native, non–no-ads), if cooldown allows.
 */
export async function maybeShowInterstitialAfterExerciseOpen(hasNoAds: boolean): Promise<void> {
  if (hasNoAds || !isNativeCapacitorApp()) return;
  const adId = resolveInterstitialAdUnitIdForCurrentPlatform();
  if (!adId) return;
  const should = recordExerciseOpenForDailyThirdRule();
  if (!should) return;
  if (!canShowByCooldown()) return;
  await runInterstitialShow("third_open", adId);
}

/**
 * After a workout log succeeds (native, non–no-ads), if cooldown allows.
 */
export async function maybeShowInterstitialAfterWorkoutLog(hasNoAds: boolean): Promise<void> {
  if (hasNoAds || !isNativeCapacitorApp()) return;
  const adId = resolveInterstitialAdUnitIdForCurrentPlatform();
  if (!adId) return;
  if (!canShowByCooldown()) return;
  await runInterstitialShow("after_workout_log", adId);
}

async function runInterstitialShow(
  _reason: "third_open" | "after_workout_log",
  adId: string
): Promise<void> {
  if (interstitialBusy) return;
  interstitialBusy = true;
  const isTesting = useAdMobTestMode();
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
