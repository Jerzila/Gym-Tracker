"use client";

import { useEffect, useRef } from "react";
import { RANK_SLUGS } from "@/lib/rankBadges";

const STORAGE_KEY = "liftlyLastOverallRankSlug";
const REQUEST_INSTALL_EVENT = "liftly-request-install-prompt";

function rankSlugToIndex(slug: string): number {
  const i = RANK_SLUGS.indexOf(slug as (typeof RANK_SLUGS)[number]);
  return i === -1 ? 0 : i;
}

export function InstallPromptOnNewRank({
  overallRankSlug,
}: {
  overallRankSlug: string | undefined;
}) {
  const hasDispatchedForSlug = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!overallRankSlug || typeof window === "undefined") return;
    const currentIndex = rankSlugToIndex(overallRankSlug);
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    const previousIndex = stored ? rankSlugToIndex(stored) : -1;
    if (currentIndex > previousIndex && !hasDispatchedForSlug.current.has(overallRankSlug)) {
      hasDispatchedForSlug.current.add(overallRankSlug);
      window.sessionStorage.setItem(STORAGE_KEY, overallRankSlug);
      window.dispatchEvent(new CustomEvent(REQUEST_INSTALL_EVENT));
    }
  }, [overallRankSlug]);

  return null;
}
