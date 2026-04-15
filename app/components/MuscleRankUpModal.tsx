"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { MuscleRankUpClientPayload } from "@/lib/buildMuscleRankUpClientPayload";
import { getRankColor } from "@/lib/rankBadges";
import { useLockBodyScroll } from "@/app/lib/useLockBodyScroll";
import { useUnits } from "@/app/components/UnitsContext";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { buttonClass } from "@/app/components/Button";

/** Single explicit sign + magnitude (avoids ++ when combined with formatWeight signed). */
function formatSignedWeightDeltaKg(valueKg: number, units: ReturnType<typeof useUnits>): string {
  const sign = valueKg > 0 ? "+" : valueKg < 0 ? "-" : "";
  const abs = Math.abs(valueKg);
  const num = formatWeight(abs, { units, signed: false, omitFractionIfWhole: true });
  return `${sign}${num} ${weightUnitLabel(units)}`;
}

function buildExplanationLines(p: MuscleRankUpClientPayload, units: ReturnType<typeof useUnits>): string[] {
  const lines: string[] = [];
  if (p.percentStrengthIncrease != null && p.percentStrengthIncrease > 0) {
    lines.push(`+${p.percentStrengthIncrease}% strength`);
  }
  if (p.totalStrengthIncreaseKg != null && Math.abs(p.totalStrengthIncreaseKg) > 0) {
    lines.push(`${formatSignedWeightDeltaKg(p.totalStrengthIncreaseKg, units)} gained`);
  }
  if (p.workoutsLast30Days != null && p.workoutsLast30Days > 0) {
    const n = p.workoutsLast30Days;
    lines.push(`${n} session${n === 1 ? "" : "s"} trained`);
  }
  return lines.slice(0, 3);
}

export function MuscleRankUpModal({
  open,
  payload,
  onClose,
}: {
  open: boolean;
  payload: MuscleRankUpClientPayload | null;
  onClose: () => void;
}) {
  const units = useUnits();
  const [mounted, setMounted] = useState(false);
  useLockBodyScroll(open && !!payload);

  useEffect(() => {
    if (!open || !payload) {
      queueMicrotask(() => setMounted(false));
      return;
    }
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [open, payload]);

  if (!open || !payload || typeof document === "undefined") return null;

  const explanationLines = buildExplanationLines(payload, units);
  const showProgress = payload.progressLabel != null && payload.progressPct != null;
  const rankGlow = getRankColor(payload.newRankSlug);
  const badgeSrc = `/${payload.newRankSlug}.png`;

  return createPortal(
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="muscle-rank-up-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/75 backdrop-blur-md transition-opacity duration-250 ease-out"
        style={{ opacity: mounted ? 1 : 0 }}
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900/95 p-6 shadow-2xl shadow-amber-500/5 ring-1 ring-amber-500/10 transition-all duration-250 ease-out"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "scale(1)" : "scale(0.95)",
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5 flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[-22%] rounded-full transition-opacity duration-300 ease-out"
              style={{
                opacity: mounted ? 1 : 0,
                background: `radial-gradient(circle at 50% 50%, ${rankGlow}8c 0%, ${rankGlow}45 38%, transparent 68%)`,
                filter: "blur(16px)",
              }}
            />
            <Image
              src={badgeSrc}
              alt={`${payload.newRankLabel} rank badge`}
              width={72}
              height={72}
              className="relative z-10 h-[4.5rem] w-[4.5rem] object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
              unoptimized
            />
          </div>
          <h2 id="muscle-rank-up-title" className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500/90">
            Rank Up
          </h2>
          <p className="mt-3 text-xl font-semibold tracking-tight text-zinc-50">{payload.muscleDisplayName}</p>
          <p className="mt-1.5 min-w-0 max-w-full overflow-x-auto whitespace-nowrap text-base font-medium tracking-tight text-zinc-300">
            <span>{payload.previousRankLabel}</span>
            <span className="mx-1.5 text-zinc-600">→</span>
            <span className="text-zinc-100">{payload.newRankLabel}</span>
          </p>
          {payload.percentileSubtext ? (
            <p className="mt-2.5 text-sm text-zinc-500">{payload.percentileSubtext}</p>
          ) : null}

          {explanationLines.length > 0 ? (
            <div className="mt-5 w-full space-y-1.5 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3 text-left">
              {explanationLines.map((line, i) => (
                <p key={i} className="text-[13px] leading-snug text-zinc-400">
                  {line}
                </p>
              ))}
            </div>
          ) : null}

          {showProgress ? (
            <div className="mt-5 w-full text-left">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{payload.progressLabel}</span>
                <span className="tabular-nums text-zinc-500">{payload.progressPct}%</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-[width] duration-500 ease-out"
                  style={{ width: `${payload.progressPct}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-6 w-full" data-rank-up-footer-slot aria-hidden />

          <button type="button" className={`${buttonClass.primary} mt-6 w-full`} onClick={onClose}>
            Continue
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
