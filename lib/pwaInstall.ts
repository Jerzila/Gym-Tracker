const INSTALL_PROMPT_LAST_SHOWN_KEY = "installPromptLastShown";
const INSTALL_PROMPT_SHOWN_SESSION_KEY = "installPromptShown";
const INSTALLED_KEY = "liftlyPwaInstalled";
const RATE_LIMIT_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isAppInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function canShowInstallPrompt(): boolean {
  if (typeof window === "undefined") return false;
  if (isAppInstalled()) return false;
  if (window.localStorage.getItem(INSTALLED_KEY) === "true") return false;
  if (window.sessionStorage.getItem(INSTALL_PROMPT_SHOWN_SESSION_KEY) === "true")
    return false;
  const last = window.localStorage.getItem(INSTALL_PROMPT_LAST_SHOWN_KEY);
  if (last) {
    const elapsed = Date.now() - Number(last);
    if (elapsed < RATE_LIMIT_DAYS * MS_PER_DAY) return false;
  }
  return true;
}

export function markInstallPromptShown(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(INSTALL_PROMPT_SHOWN_SESSION_KEY, "true");
  window.localStorage.setItem(INSTALL_PROMPT_LAST_SHOWN_KEY, String(Date.now()));
}

export function markPwaInstalled(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INSTALLED_KEY, "true");
}
