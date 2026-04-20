"use client";

import { RankCrownIcon } from "@/app/components/RankCrownIcon";
import { useProAccess } from "@/app/components/ProAccessProvider";
import { haptic } from "@/lib/haptic";

/** Dashboard header (/) — opens Liftly Pro paywall for non‑subscribers. Hidden entirely when `hasPro`. */
export function DashboardGetProButton() {
  const { hasPro, ready, requirePro } = useProAccess();

  if (!ready) return null;
  if (hasPro) return null;

  return (
    <button
      type="button"
      onClick={() => {
        haptic();
        requirePro("get_pro");
      }}
      className="tap-feedback inline-flex max-w-[min(11rem,46vw)] items-center gap-1.5 rounded-full border border-amber-500/45 bg-amber-500/10 px-2.5 py-1.5 text-left text-[11px] font-semibold text-amber-200 transition hover:border-amber-400/65 hover:bg-amber-500/16 hover:text-amber-100 sm:text-xs"
      aria-label="Get Liftly Pro"
    >
      <RankCrownIcon size={14} title="Liftly Pro" />
      <span className="truncate">Get Pro</span>
    </button>
  );
}
