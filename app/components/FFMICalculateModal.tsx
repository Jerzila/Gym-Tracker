"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { saveCalculatedFFMI } from "@/app/actions/profile";
import { useLockBodyScroll } from "@/app/lib/useLockBodyScroll";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { formatHeightDisplay } from "@/lib/units";
import { useUnits } from "@/app/components/UnitsContext";
import { getFFMICategory } from "@/lib/ffmi";

const RANGE_LEGEND = [
  { range: "< 18", label: "Very low" },
  { range: "18–20", label: "Average" },
  { range: "20–22", label: "Trained" },
  { range: "22–24", label: "Muscular" },
  { range: "24–25", label: "Elite natural" },
  { range: "25+", label: "Extremely muscular" },
] as const;

export function FFMICalculateModal({
  open,
  onClose,
  heightCm,
  weightKg,
  initialBodyFatPercent,
}: {
  open: boolean;
  onClose: () => void;
  heightCm: number;
  weightKg: number;
  initialBodyFatPercent: number | null;
}) {
  const router = useRouter();
  const units = useUnits();
  const [bodyFatStr, setBodyFatStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ffmi: number; label: string } | null>(null);
  const [pending, startTransition] = useTransition();
  /** Same tap that opens the modal can finish on the backdrop (scroll-lock / portal); ignore close briefly. */
  const allowBackdropCloseRef = useRef(false);

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) {
      allowBackdropCloseRef.current = false;
      return;
    }
    setError(null);
    setResult(null);
    setBodyFatStr(
      initialBodyFatPercent != null && Number.isFinite(initialBodyFatPercent)
        ? String(initialBodyFatPercent)
        : ""
    );
    allowBackdropCloseRef.current = false;
    const t = window.setTimeout(() => {
      allowBackdropCloseRef.current = true;
    }, 200);
    return () => window.clearTimeout(t);
  }, [open, initialBodyFatPercent]);

  if (!open) return null;

  function handleCalculate() {
    setError(null);
    const normalized = bodyFatStr.trim().replace(",", ".");
    const pct = Number(normalized);
    if (!Number.isFinite(pct)) {
      setError("Enter a valid body fat percentage.");
      return;
    }

    startTransition(async () => {
      const res = await saveCalculatedFFMI(pct);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const cat = getFFMICategory(res.ffmi);
      setResult({ ffmi: res.ffmi, label: res.categoryLabel });
      router.refresh();
    });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ffmi-modal-title"
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
        <div className="overflow-y-auto overscroll-contain p-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:pb-4">
          <h3 id="ffmi-modal-title" className="text-base font-semibold leading-snug text-zinc-100">
            Calculate FFMI{" "}
            <span className="whitespace-nowrap text-[11px] font-normal text-zinc-500/60 sm:text-xs">
              (see how muscular you are)
            </span>
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Uses your profile height and latest logged weight. Body fat is not estimated — enter a value you
            trust (e.g. from a scan or calipers).
          </p>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3 border-b border-zinc-800/80 pb-2">
              <dt className="text-zinc-500">Height</dt>
              <dd className="text-right font-medium text-zinc-200">{formatHeightDisplay(heightCm, units)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-zinc-800/80 pb-2">
              <dt className="text-zinc-500">Weight</dt>
              <dd className="text-right font-medium text-zinc-200">
                {formatWeight(weightKg, { units })} {weightUnitLabel(units)}
              </dd>
            </div>
            <div className="space-y-1">
              <label htmlFor="ffmi-bodyfat" className="block text-xs text-zinc-500">
                Body fat %
              </label>
              <input
                id="ffmi-bodyfat"
                type="number"
                inputMode="decimal"
                min={3}
                max={50}
                step="0.1"
                value={bodyFatStr}
                onChange={(e) => setBodyFatStr(e.target.value)}
                placeholder="e.g. 15"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </dl>

          {error ? (
            <p className="mt-3 text-xs text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
              <p className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm text-zinc-400">FFMI:</span>
                <span className="text-lg font-semibold tabular-nums text-zinc-100">{result.ffmi}</span>
                <span className="text-sm font-medium" style={{ color: getFFMICategory(result.ffmi).color }}>
                  {result.label}
                </span>
              </p>
              <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Reference</p>
              <ul className="mt-1 space-y-0.5 text-[11px] text-zinc-500">
                {RANGE_LEGEND.map((row) => (
                  <li key={row.label}>
                    {row.range} → {row.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
            >
              {result ? "Close" : "Cancel"}
            </button>
            {!result ? (
              <button
                type="button"
                disabled={pending}
                onClick={handleCalculate}
                className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
              >
                {pending ? "…" : "Calculate"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
