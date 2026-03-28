"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { createWorkout } from "@/app/actions/workouts";
import { DatePicker } from "@/app/components/DatePicker";
import { buttonClass } from "@/app/components/Button";
import { useToast } from "@/app/components/Toast";
import { hapticWorkoutSaved } from "@/lib/haptic";
import { useWorkoutDataCache } from "@/app/components/WorkoutDataCacheContext";
import { useUnits } from "@/app/components/UnitsContext";
import { lbToKg } from "@/lib/units";
import { weightUnitLabel } from "@/lib/formatWeight";

type State = { message?: string; error?: string; hitPr?: boolean } | undefined;

function formAction(_: State, formData: FormData) {
  const exerciseId = formData.get("exercise_id") as string;
  return createWorkout(exerciseId, formData);
}

const EXPAND_MS = 220;
const SHOW_SPINNER_AFTER_MS = 300;

type Props = {
  exerciseId: string;
  repMin: number;
  repMax: number;
  loadType?: "bilateral" | "unilateral";
  onExpandedChange?: (expanded: boolean) => void;
};

const initialSetValues = { weight: "", reps: ["", "", "", "", ""] as string[] };

export function LogWorkoutForm({ exerciseId, repMin, repMax, loadType = "bilateral", onExpandedChange }: Props) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  const isUnilateral = loadType === "unilateral";
  const [state, action] = useActionState(formAction, undefined);
  const [expanded, setExpanded] = useState(false);
  const [setValues, setSetValues] = useState(initialSetValues);
  const [showSpinner, setShowSpinner] = useState(false);
  const spinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();
  const cache = useWorkoutDataCache();
  const lastShownMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (state?.message) {
      setExpanded(false);
      setSetValues(initialSetValues);
      cache?.invalidate?.();
      // Only show toast once per message to avoid duplicates from effect re-runs
      if (lastShownMessageRef.current !== state.message) {
        lastShownMessageRef.current = state.message;
        toast.show(state.message);
        hapticWorkoutSaved(!!state.hitPr);
      }
      window.dispatchEvent(new CustomEvent("liftly-request-install-prompt"));
    }
    if (state?.message || state?.error) {
      setShowSpinner(false);
      if (spinnerTimerRef.current) {
        clearTimeout(spinnerTimerRef.current);
        spinnerTimerRef.current = null;
      }
    }
  }, [state?.message, state?.error, toast]);

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  function closeKeyboardAndRefreshLayout() {
    if (typeof document !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        window.scrollTo(window.scrollX, window.scrollY);
      }, 50);
    }
  }

  function handleSubmit() {
    closeKeyboardAndRefreshLayout();
    lastShownMessageRef.current = null; // allow next result to show toast
    setShowSpinner(false);
    if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
    spinnerTimerRef.current = setTimeout(() => setShowSpinner(true), SHOW_SPINNER_AFTER_MS);
  }

  return (
    <div className="space-y-3">
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={buttonClass.primary}
        >
          Log Workout
        </button>
      )}

      <div
        className="grid expand-collapse"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className={`min-h-0 ${expanded ? "overflow-visible" : "overflow-hidden"}`}>
          <div
            className="transition-opacity duration-[220ms] ease-in-out"
            style={{ opacity: expanded ? 1 : 0 }}
          >
            <form
              onSubmit={handleSubmit}
            action={action}
            className="space-y-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 shadow-sm"
          >
            <input type="hidden" name="exercise_id" value={exerciseId} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="date" className="block text-xs text-zinc-500">
                  Date
                </label>
                <DatePicker
                  id="date"
                  name="date"
                  required
                  disableFuture
                  className="mt-1 w-full"
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-zinc-500">
                Sets ({repMin}–{repMax} reps target). Log 1–5 sets; only fill the sets you did.
              </p>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label htmlFor="weight" className="block text-xs text-zinc-600">
                    Weight ({weightLabel})
                  </label>
                {units === "imperial" && (
                  <input
                    type="hidden"
                    name="weight"
                    value={
                      setValues.weight !== "" && Number.isFinite(Number(setValues.weight))
                        ? String(lbToKg(Number(setValues.weight)))
                        : ""
                    }
                  />
                )}
                <input
                  id="weight"
                  name={units === "metric" ? "weight" : undefined}
                  type="number"
                  inputMode="decimal"
                  enterKeyHint="done"
                  min="0"
                  step={units === "metric" ? "0.5" : "1"}
                  placeholder="0"
                  value={setValues.weight}
                  onChange={(e) => setSetValues((prev) => ({ ...prev, weight: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") closeKeyboardAndRefreshLayout();
                  }}
                    className="mt-1 w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-center text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  {isUnilateral && (
                    <p className="mt-1 text-[11px] text-zinc-500">One arm weight</p>
                  )}
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-14">
                    <label htmlFor={`reps_${i}`} className="block text-xs text-zinc-600">
                      Set {i}
                    </label>
                    <input
                      id={`reps_${i}`}
                      name={`reps_${i}`}
                      type="number"
                      inputMode="numeric"
                      enterKeyHint="done"
                      min="0"
                      placeholder="—"
                      value={setValues.reps[i - 1]}
                      onChange={(e) =>
                        setSetValues((prev) => ({
                          ...prev,
                          reps: prev.reps.map((r, j) => (j === i - 1 ? e.target.value : r)),
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") closeKeyboardAndRefreshLayout();
                      }}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-center text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className={`${buttonClass.ghost} text-sm px-0 py-0`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={buttonClass.primary}
                disabled={showSpinner}
              >
                {showSpinner ? "Saving…" : "Save workout"}
              </button>
            </div>
            {state?.error && (
              <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                {state.error}
              </p>
            )}
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}
