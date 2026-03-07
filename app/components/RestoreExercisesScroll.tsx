"use client";

import { useEffect } from "react";

const EXERCISES_SCROLL_KEY = "gym-exercises-scroll";

/** Restores scroll position when returning to the exercises list from an exercise detail page. */
export function RestoreExercisesScroll() {
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(EXERCISES_SCROLL_KEY);
      if (raw === null) return;
      sessionStorage.removeItem(EXERCISES_SCROLL_KEY);
      const y = Number(raw);
      if (!Number.isFinite(y) || y < 0) return;
      window.scrollTo(0, y);
    } catch {
      // ignore
    }
  }, []);
  return null;
}
