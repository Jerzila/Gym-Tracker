"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { saveCalculatedFFMI } from "@/app/actions/profile";
import { useLockBodyScroll } from "@/app/lib/useLockBodyScroll";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { formatHeightDisplay } from "@/lib/units";
import { useUnits } from "@/app/components/UnitsContext";
import { getFFMICategory } from "@/lib/ffmi";
import { useProAccess } from "@/app/components/ProAccessProvider";

const RANGE_LEGEND_MALE = [
  { range: "< 18", label: "Very low" },
  { range: "18–20", label: "Average" },
  { range: "20–22", label: "Trained" },
  { range: "22–24", label: "Muscular" },
  { range: "24–25", label: "Elite natural" },
  { range: "25+", label: "Extremely muscular" },
] as const;

const RANGE_LEGEND_FEMALE = [
  { range: "< 14", label: "Very low" },
  { range: "14–16", label: "Average" },
  { range: "16–18", label: "Trained" },
  { range: "18–20", label: "Muscular" },
  { range: "20–21", label: "Elite natural" },
  { range: "21+", label: "Extremely muscular" },
] as const;

function filterNumericPercentDraft(nextRaw: string) {
  // Keep the user's typing stable: only reject characters we never want.
  // Allow digits and a single decimal separator (dot or comma).
  const next = nextRaw.replace(/[^\d.,]/g, "");
  let seenSep = false;
  let out = "";
  for (const ch of next) {
    if (ch === "." || ch === ",") {
      if (seenSep) continue;
      seenSep = true;
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}

function parsePercentDraft(draft: string) {
  const normalized = draft.trim().replace(",", ".");
  if (normalized === "" || normalized === "." || normalized === ",") return null;
  const pct = Number(normalized);
  return Number.isFinite(pct) ? pct : null;
}

type BodyFatFieldHandle = {
  getDraft: () => string;
};

const BodyFatField = forwardRef<
  BodyFatFieldHandle,
  {
    initialDraft: string;
    error: string | null;
    calculatedDraft: string | null;
    calculationVersion: number;
    onBecameOutdated: () => void;
    onTypingWithError: () => void;
  }
>(function BodyFatField(
  { initialDraft, error, calculatedDraft, calculationVersion, onBecameOutdated, onTypingWithError },
  ref
) {
  const [draft, setDraft] = useState(initialDraft);
  const outdatedNotifiedRef = useRef(false);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  useEffect(() => {
    outdatedNotifiedRef.current = false;
  }, [calculationVersion]);

  useImperativeHandle(
    ref,
    () => ({
      getDraft: () => draft,
    }),
    [draft]
  );

  return (
    <div className="space-y-1">
      <label htmlFor="ffmi-bodyfat" className="block text-xs text-zinc-500">
        Body fat %
      </label>
      <input
        id="ffmi-bodyfat"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="done"
        value={draft}
        onChange={(e) => {
          const filtered = filterNumericPercentDraft(e.target.value);
          setDraft(filtered);
          if (error) onTypingWithError();
          if (!outdatedNotifiedRef.current && calculatedDraft != null && filtered !== calculatedDraft) {
            outdatedNotifiedRef.current = true;
            onBecameOutdated();
          }
        }}
        placeholder="e.g. 15"
        aria-invalid={error ? true : undefined}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
    </div>
  );
});

export function FFMICalculateModal({
  open,
  onClose,
  heightCm,
  weightKg,
  initialBodyFatPercent,
  gender = "male",
}: {
  open: boolean;
  onClose: () => void;
  heightCm: number;
  weightKg: number;
  initialBodyFatPercent: number | null;
  gender?: "male" | "female";
}) {
  const router = useRouter();
  const units = useUnits();
  const { ready: proReady, requirePro } = useProAccess();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ffmi: number; label: string } | null>(null);
  const [resultOutdated, setResultOutdated] = useState(false);
  const [calculatedDraft, setCalculatedDraft] = useState<string | null>(null);
  const [calculationVersion, setCalculationVersion] = useState(0);
  const [pending, startTransition] = useTransition();
  const bodyFatFieldRef = useRef<BodyFatFieldHandle | null>(null);
  const [keyboardOffsetPx, setKeyboardOffsetPx] = useState(0);
  const rangeLegend = useMemo(
    () => (gender === "female" ? RANGE_LEGEND_FEMALE : RANGE_LEGEND_MALE),
    [gender]
  );
  const initialDraft = useMemo(() => {
    return initialBodyFatPercent != null && Number.isFinite(initialBodyFatPercent)
      ? String(initialBodyFatPercent)
      : "";
  }, [initialBodyFatPercent]);
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
    setResultOutdated(false);
    setCalculatedDraft(null);
    setCalculationVersion(0);
    allowBackdropCloseRef.current = false;
    const t = window.setTimeout(() => {
      allowBackdropCloseRef.current = true;
    }, 200);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // On iOS Safari, visualViewport.height shrinks when keyboard opens.
      // Compute how much of the layout viewport is occluded and lift the sheet by that amount.
      const occluded = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffsetPx(Math.round(occluded));
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [open]);

  if (!open) return null;

  function handleCalculate() {
    setError(null);
    const draft = bodyFatFieldRef.current?.getDraft() ?? "";
    const pct = parsePercentDraft(draft);
    if (pct == null) {
      setError("Enter a valid body fat percentage.");
      return;
    }
    if (pct < 1 || pct > 60) {
      setError("Body fat % must be between 1 and 60.");
      return;
    }

    if (!proReady) return;
    if (!requirePro("ffmi")) return;

    startTransition(async () => {
      const res = await saveCalculatedFFMI(pct);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult({ ffmi: res.ffmi, label: res.categoryLabel });
      setResultOutdated(false);
      setCalculatedDraft(draft);
      setCalculationVersion((v) => v + 1);
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
        style={{
          transform: keyboardOffsetPx ? `translateY(-${keyboardOffsetPx}px)` : undefined,
          transition: keyboardOffsetPx ? "transform 160ms ease-out" : undefined,
          willChange: keyboardOffsetPx ? "transform" : undefined,
        }}
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
            <BodyFatField
              ref={bodyFatFieldRef}
              initialDraft={initialDraft}
              error={error}
              calculatedDraft={calculatedDraft}
              calculationVersion={calculationVersion}
              onTypingWithError={() => {
                // Clear stale inline error without validating while typing.
                setError(null);
              }}
              onBecameOutdated={() => {
                // Mark the shown result as outdated (only once per post-calc edit).
                if (result) setResultOutdated(true);
              }}
            />
          </dl>

          <div className="mt-3">
            {!result || resultOutdated ? (
              <button
                type="button"
                disabled={pending || !proReady}
                onClick={handleCalculate}
                className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
              >
                {pending ? "…" : "Calculate FFMI"}
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="mt-3 text-xs text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          {result ? (
            <div
              className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3"
              style={resultOutdated ? { opacity: 0.5 } : undefined}
              aria-hidden={resultOutdated ? true : undefined}
            >
              <p className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm text-zinc-400">FFMI:</span>
                <span className="text-lg font-semibold tabular-nums text-zinc-100">{result.ffmi}</span>
                <span
                  className="text-sm font-medium"
                  style={{ color: getFFMICategory(result.ffmi, gender).color }}
                >
                  {result.label}
                </span>
              </p>
              <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Reference</p>
              <ul className="mt-1 space-y-0.5 text-[11px] text-zinc-500">
                {rangeLegend.map((row) => (
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
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
