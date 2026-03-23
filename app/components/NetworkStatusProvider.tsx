"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type NetworkStatusContextValue = {
  isOnline: boolean;
  requireOnline: () => boolean;
};

const OFFLINE_BANNER_TEXT = "No internet connection. Reconnect to continue using Liftly.";
const OFFLINE_ACTION_TEXT = "You're offline. Reconnect to save your data.";

const NetworkStatusContext = createContext<NetworkStatusContextValue | undefined>(undefined);

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineActionMessage, setShowOfflineActionMessage] = useState(false);

  useEffect(() => {
    const syncOnlineStatus = () => setIsOnline(window.navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineActionMessage(false);
    };
    const handleOffline = () => setIsOnline(false);

    syncOnlineStatus();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!showOfflineActionMessage) return;
    const timeout = window.setTimeout(() => setShowOfflineActionMessage(false), 3200);
    return () => window.clearTimeout(timeout);
  }, [showOfflineActionMessage]);

  const requireOnline = useCallback(() => {
    if (window.navigator.onLine) return true;
    setIsOnline(false);
    setShowOfflineActionMessage(true);
    return false;
  }, []);

  const value = useMemo(
    () => ({
      isOnline,
      requireOnline,
    }),
    [isOnline, requireOnline]
  );

  return (
    <NetworkStatusContext.Provider value={value}>
      <div aria-live="polite" className="fixed inset-x-0 top-0 z-[70] px-3 pt-2 sm:px-4">
        {!isOnline && (
          <div className="mx-auto w-full max-w-3xl rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-center text-sm font-medium text-amber-200 shadow-lg backdrop-blur">
            {OFFLINE_BANNER_TEXT}
          </div>
        )}
        {showOfflineActionMessage && (
          <div className="mx-auto mt-2 w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-center text-sm text-zinc-100 shadow-lg">
            {OFFLINE_ACTION_TEXT}
          </div>
        )}
      </div>
      <div className={isOnline ? "" : "pt-16"}>{children}</div>
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus() {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error("useNetworkStatus must be used within NetworkStatusProvider.");
  }
  return context;
}
