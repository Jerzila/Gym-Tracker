"use client";

import React from "react";

export function FlagIcon({
  code,
  size = 20,
  className = "",
}: {
  code: string | null | undefined;
  /** Width in px. Height will be 3/4 of width (4:3 flags). */
  size?: number;
  className?: string;
}) {
  const cc = (code ?? "").trim().toLowerCase();
  if (cc.length !== 2) return null;

  const height = Math.round((size * 3) / 4);

  return (
    <span
      aria-hidden
      className={[
        "fi",
        `fi-${cc}`,
        "inline-block shrink-0 rounded-[3px] align-[-0.125em] ring-1 ring-black/10 dark:ring-white/10",
        className,
      ].join(" ")}
      style={{ width: size, height }}
    />
  );
}

