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
import { getIncomingFriendRequests } from "@/app/actions/social";

const POLL_MS = 4000;

type FriendIncomingRequestsValue = {
  pendingCount: number;
  refresh: () => Promise<void>;
};

const FriendIncomingRequestsContext = createContext<FriendIncomingRequestsValue | null>(null);

export function FriendIncomingRequestsProvider({ children }: { children: ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    const { requests, error } = await getIncomingFriendRequests();
    if (error) return;
    setPendingCount(requests.length);
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const value = useMemo(() => ({ pendingCount, refresh }), [pendingCount, refresh]);

  return (
    <FriendIncomingRequestsContext.Provider value={value}>
      {children}
    </FriendIncomingRequestsContext.Provider>
  );
}

export function useFriendIncomingRequests() {
  const ctx = useContext(FriendIncomingRequestsContext);
  if (!ctx) {
    throw new Error("useFriendIncomingRequests must be used within FriendIncomingRequestsProvider");
  }
  return ctx;
}

export function PendingFriendRequestBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 9 ? "9+" : String(count);
  return (
    <span
      className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-zinc-950"
      aria-hidden
    >
      {label}
    </span>
  );
}
