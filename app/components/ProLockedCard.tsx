"use client";

import { useProAccess } from "@/app/components/ProAccessProvider";

export function ProLockedCard({
  title,
  description,
  reason,
  className = "",
}: {
  title: string;
  description: string;
  reason:
    | "ffmi"
    | "muscle_rankings"
    | "compare_progress"
    | "improve_rank"
    | "muscle_balance_history"
    | "top_improvements"
    | "advanced_analytics"
    | "monthly_analytics"
    | "full_leaderboard"
    | "friend_profile"
    | "muscle_rank_up"
    | "get_pro";
  className?: string;
}) {
  const { requirePro } = useProAccess();

  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 ${className}`}>
      <p className="text-sm font-semibold text-zinc-100">{title}</p>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
      <button
        type="button"
        onClick={() => requirePro(reason)}
        className="mt-3 rounded-lg border border-amber-500/60 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20"
      >
        Unlock with Liftly Pro
      </button>
    </div>
  );
}
