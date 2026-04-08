"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLockBodyScroll } from "@/app/lib/useLockBodyScroll";
import { formatWeight, weightUnitLabel, KG_TO_LB } from "@/lib/formatWeight";
import type { WeightUnits } from "@/lib/formatWeight";

export type ExerciseProgressRankRow = {
  rank: number;
  exerciseId: string;
  name: string;
  /** Chronological latest − first max weight (kg). */
  totalProgressKg: number;
  /** null → show “calculating rate…” */
  rateKgPerMonth: number | null;
};

function formatSignedDeltaOneDecKg(valueKg: number, units: WeightUnits): string {
  const s = formatWeight(valueKg, { units });
  const display = units === "imperial" ? valueKg * KG_TO_LB : valueKg;
  const rounded = Math.round(display * 10) / 10;
  if (rounded > 0) return `+${s}`;
  if (rounded < 0) return s;
  return "+0.0";
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-500/55 bg-amber-500/15 text-[11px] font-bold tabular-nums text-amber-400"
      aria-hidden
    >
      {rank}
    </span>
  );
}

export function ProgressRankingRow({
  row,
  units,
}: {
  row: ExerciseProgressRankRow;
  units: WeightUnits;
}) {
  const weightLabel = weightUnitLabel(units);
  const totalPart = `${formatSignedDeltaOneDecKg(row.totalProgressKg, units)} ${weightLabel} total`;
  const ratePart =
    row.rateKgPerMonth != null ? (
      `${formatSignedDeltaOneDecKg(row.rateKgPerMonth, units)} ${weightLabel}/month`
    ) : null;

  return (
    <div className="flex gap-2.5">
      <RankBadge rank={row.rank} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight text-zinc-100">{row.name}</p>
        <p className="mt-0.5 text-sm font-medium tabular-nums leading-snug text-emerald-400">
          <span>{totalPart}</span>
          <span className="font-normal text-zinc-500"> • </span>
          {ratePart != null ? (
            <span>{ratePart}</span>
          ) : (
            <span className="font-normal text-zinc-400">calculating rate…</span>
          )}
        </p>
      </div>
    </div>
  );
}

export function ExerciseProgressRankingsModal({
  open,
  onClose,
  rows,
  units,
}: {
  open: boolean;
  onClose: () => void;
  rows: ExerciseProgressRankRow[];
  units: WeightUnits;
}) {
  useLockBodyScroll(open);
  const allowBackdropCloseRef = useRef(false);

  useEffect(() => {
    if (!open) {
      allowBackdropCloseRef.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      allowBackdropCloseRef.current = true;
    }, 200);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-progress-rankings-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 tap-feedback"
        aria-label="Close"
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          if (!allowBackdropCloseRef.current) return;
          onClose();
        }}
      />
      <div
        className="relative z-10 flex max-h-[min(92dvh,100%)] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl border border-zinc-800 border-b-0 bg-zinc-900 shadow-xl sm:max-h-[min(90dvh,100%)] sm:rounded-xl sm:border-b"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-800/80 px-4 pb-3 pt-4 sm:pt-4">
          <h3
            id="exercise-progress-rankings-title"
            className="text-base font-semibold leading-snug text-zinc-100"
          >
            Exercise Progress Rankings
          </h3>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Ranked by progress rate
          </p>
        </div>
        <ul className="max-h-[min(70dvh,520px)] space-y-2.5 overflow-y-auto overscroll-contain px-4 py-3 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
          {rows.map((row) => (
            <li
              key={row.exerciseId}
              className="rounded-lg border border-zinc-800/90 bg-zinc-950/40 px-2.5 py-2"
            >
              <ProgressRankingRow row={row} units={units} />
            </li>
          ))}
        </ul>
        <div className="border-t border-zinc-800/80 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={onClose}
            className="tap-feedback w-full rounded-lg border border-zinc-700 bg-zinc-800/60 py-2 text-sm font-medium text-zinc-200 transition active:scale-[0.98] hover:border-zinc-600 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
