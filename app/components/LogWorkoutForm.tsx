"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { createWorkout } from "@/app/actions/workouts";
import { DatePicker } from "@/app/components/DatePicker";
import { buttonClass } from "@/app/components/Button";
import { useToast } from "@/app/components/Toast";
import { hapticWorkoutSaved } from "@/lib/haptic";
import { useWorkoutDataCache } from "@/app/components/WorkoutDataCacheContext";
import { useUnits } from "@/app/components/UnitsContext";
import { lbToKg } from "@/lib/units";
import { weightUnitLabel } from "@/lib/formatWeight";
import { normalizeLoadType, type LoadType } from "@/lib/loadType";
import type { MuscleRankUpClientPayload } from "@/lib/buildMuscleRankUpClientPayload";
import { MuscleRankUpModal } from "@/app/components/MuscleRankUpModal";
import { useMuscleRankUpFromWorkoutSave } from "@/app/hooks/useMuscleRankUpFromWorkoutSave";

type State =
  | {
      message?: string;
      error?: string;
      hitPr?: boolean;
      workoutId?: string;
      rankUp?: MuscleRankUpClientPayload;
    }
  | undefined;

function formAction(_: State, formData: FormData) {
  const exerciseId = formData.get("exercise_id") as string;
  return createWorkout(exerciseId, formData);
}

type Props = {
  exerciseId: string;
  repMin: number;
  repMax: number;
  loadType?: LoadType;
  onExpandedChange?: (expanded: boolean) => void;
};

const initialSetValues = { weight: "", reps: ["", "", "", "", ""] as string[] };
const initialAdvancedValues = {
  weights: ["", "", "", "", ""] as string[],
  reps: ["", "", "", "", ""] as string[],
};

const SAVED_CONFIRM_MS = 900;

export function LogWorkoutForm({
  exerciseId,
  repMin,
  repMax,
  loadType = "weight",
  onExpandedChange,
}: Props) {
  const router = useRouter();
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  const lt = normalizeLoadType(loadType);
  const isUnilateral = lt === "unilateral";
  const isBodyweight = lt === "bodyweight";
  const isTimed = lt === "timed";
  const [state, action, isPending] = useActionState(formAction, undefined);
  const [expanded, setExpanded] = useState(false);
  const [advancedLogging, setAdvancedLogging] = useState(false);
  const [setValues, setSetValues] = useState(initialSetValues);
  const [advancedValues, setAdvancedValues] = useState(initialAdvancedValues);
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false);
  const toast = useToast();
  const cache = useWorkoutDataCache();
  const lastShownMessageRef = useRef<string | null>(null);
  /** Post-save auto-collapse; must be cleared if the user reopens the form before it fires. */
  const collapseAfterSaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!state?.message) return;
    queueMicrotask(() => setShowSavedConfirmation(true));
    if (collapseAfterSaveTimerRef.current) {
      clearTimeout(collapseAfterSaveTimerRef.current);
      collapseAfterSaveTimerRef.current = null;
    }
    collapseAfterSaveTimerRef.current = window.setTimeout(() => {
      collapseAfterSaveTimerRef.current = null;
      setShowSavedConfirmation(false);
      setExpanded(false);
    }, SAVED_CONFIRM_MS);
    return () => {
      if (collapseAfterSaveTimerRef.current) {
        clearTimeout(collapseAfterSaveTimerRef.current);
        collapseAfterSaveTimerRef.current = null;
      }
    };
  }, [state]);

  useEffect(() => {
    if (state?.message) {
      queueMicrotask(() => {
        setAdvancedLogging(false);
        setSetValues(initialSetValues);
        setAdvancedValues(initialAdvancedValues);
      });
      cache?.invalidate?.();
      router.refresh();
      // Only show toast once per message to avoid duplicates from effect re-runs
      if (lastShownMessageRef.current !== state.message) {
        lastShownMessageRef.current = state.message;
        toast.show(state.message);
        hapticWorkoutSaved(!!state.hitPr);
      }
    }
  }, [state, toast, cache, router]);

  useEffect(() => {
    onExpandedChange?.(expanded);
    if (collapseAfterSaveTimerRef.current) {
      clearTimeout(collapseAfterSaveTimerRef.current);
      collapseAfterSaveTimerRef.current = null;
    }
    if (expanded) {
      setShowSavedConfirmation(false);
    } else {
      queueMicrotask(() => {
        setAdvancedLogging(false);
        setShowSavedConfirmation(false);
      });
    }
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
  }

  // When enabling Advanced, auto-fill per-set weights from simple weight.
  useEffect(() => {
    if (!advancedLogging) return;
    const w = setValues.weight;
    if (String(w ?? "").trim() === "") return;
    queueMicrotask(() => {
      setAdvancedValues((prev) => {
        const hasAnyWeight = prev.weights.some((x) => String(x).trim() !== "");
        if (hasAnyWeight) return prev;
        return { ...prev, weights: prev.weights.map(() => w) };
      });
    });
  }, [advancedLogging, setValues.weight]);

  const rankUpModal = useMuscleRankUpFromWorkoutSave(state ?? null);

  return (
    <>
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
              <div className="flex items-start justify-between gap-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Log set
                </p>
                {!isBodyweight && !isTimed && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-xs text-zinc-500">Advanced</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={advancedLogging}
                      onClick={() => setAdvancedLogging((v) => !v)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                        advancedLogging
                          ? "border-amber-500 bg-amber-500/30"
                          : "border-zinc-700 bg-zinc-900"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-zinc-100 transition-transform ${
                          advancedLogging ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
              <p className="mb-2 text-xs text-zinc-500">
                {isTimed
                  ? "Log each hold you did; skip empty sets."
                  : isBodyweight
                    ? "Log 1–5 sets; only fill the sets you did."
                    : `Sets (${repMin}–${repMax} reps target). Log 1–5 sets; only fill the sets you did.`}
              </p>
              {isTimed ? (
                <div className="rounded-xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                  <div className="mb-2.5 flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Hold time
                    </span>
                    <span className="text-[10px] text-zinc-600">seconds</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-zinc-700/45 bg-zinc-900/70 transition-[border-color,box-shadow] focus-within:border-amber-500/55 focus-within:shadow-[0_0_0_1px_rgba(245,158,11,0.25)]"
                      >
                        <label
                          htmlFor={`reps_${i}`}
                          className="border-b border-zinc-800/90 py-1 text-center text-[10px] font-semibold tabular-nums text-zinc-500"
                        >
                          {i}
                        </label>
                        <input
                          id={`reps_${i}`}
                          name={`reps_${i}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="off"
                          enterKeyHint="done"
                          maxLength={5}
                          placeholder="—"
                          aria-label={`Set ${i} seconds`}
                          value={setValues.reps[i - 1]}
                          onChange={(e) => {
                            const next = e.target.value.replace(/\D/g, "").slice(0, 5);
                            setSetValues((prev) => ({
                              ...prev,
                              reps: prev.reps.map((r, j) => (j === i - 1 ? next : r)),
                            }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") closeKeyboardAndRefreshLayout();
                          }}
                          className="min-h-[2.35rem] w-full min-w-0 border-0 bg-transparent px-0.5 py-1.5 text-center text-sm tabular-nums leading-none text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                        />
                        <div className="border-t border-zinc-800/80 py-1 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                          sec
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : isBodyweight ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-zinc-600">Reps</p>
                    <div className="mt-1 flex flex-wrap items-end gap-4">
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
                  <div>
                    <label htmlFor="weight" className="block text-xs text-zinc-600">
                      Extra Weight (optional)
                      <span className="font-normal text-zinc-500">
                        {" "}
                        (+{weightLabel})
                      </span>
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
                      className="mt-1 w-28 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-center text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Added load only; leave empty or 0 for bodyweight only
                    </p>
                  </div>
                  {(() => {
                    const weightKg =
                      units === "metric"
                        ? setValues.weight
                        : setValues.weight !== "" && Number.isFinite(Number(setValues.weight))
                          ? String(lbToKg(Number(setValues.weight)))
                          : "";
                    return [1, 2, 3, 4, 5].map((i) => (
                      <input key={i} type="hidden" name={`weight_${i}`} value={weightKg} />
                    ));
                  })()}
                </div>
              ) : !advancedLogging ? (
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label htmlFor="weight" className="block text-xs text-zinc-600">
                      {`Weight (${weightLabel})`}
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

                  {/* Always send per-set weights internally (simple mode). */}
                  {(() => {
                    const weightKg =
                      units === "metric"
                        ? setValues.weight
                        : setValues.weight !== "" && Number.isFinite(Number(setValues.weight))
                          ? String(lbToKg(Number(setValues.weight)))
                          : "";
                    return [1, 2, 3, 4, 5].map((i) => (
                      <input key={i} type="hidden" name={`weight_${i}`} value={weightKg} />
                    ));
                  })()}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[3.5rem_1fr_3.5rem] gap-2 text-xs text-zinc-500">
                    <span />
                    <span>
                      {isBodyweight ? `Extra (${weightLabel}, optional)` : `Weight (${weightLabel})`}
                    </span>
                    <span className="text-right">Reps</span>
                  </div>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="grid grid-cols-[3.5rem_1fr_3.5rem] items-end gap-2">
                      <label htmlFor={`adv_reps_${i}`} className="text-xs text-zinc-600">
                        Set {i}
                      </label>
                      <div>
                        {units === "imperial" && (
                          <input
                            type="hidden"
                            name={`weight_${i}`}
                            value={
                              advancedValues.weights[i - 1] !== "" &&
                              Number.isFinite(Number(advancedValues.weights[i - 1]))
                                ? String(lbToKg(Number(advancedValues.weights[i - 1])))
                                : ""
                            }
                          />
                        )}
                        <input
                          id={`adv_weight_${i}`}
                          name={units === "metric" ? `weight_${i}` : undefined}
                          type="number"
                          inputMode="decimal"
                          enterKeyHint="done"
                          min="0"
                          step={units === "metric" ? "0.5" : "1"}
                          placeholder={isBodyweight ? "0" : "0"}
                          value={advancedValues.weights[i - 1]}
                          onChange={(e) =>
                            setAdvancedValues((prev) => ({
                              ...prev,
                              weights: prev.weights.map((w, j) => (j === i - 1 ? e.target.value : w)),
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") closeKeyboardAndRefreshLayout();
                          }}
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-center text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        {isUnilateral && i === 1 && (
                          <p className="mt-1 text-[11px] text-zinc-500">One arm weight</p>
                        )}
                      </div>
                      <input
                        id={`adv_reps_${i}`}
                        name={`reps_${i}`}
                        type="number"
                        inputMode="numeric"
                        enterKeyHint="done"
                        min="0"
                        placeholder="—"
                        value={advancedValues.reps[i - 1]}
                        onChange={(e) =>
                          setAdvancedValues((prev) => ({
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
              )}
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
                disabled={isPending || showSavedConfirmation}
                aria-busy={isPending}
                aria-live="polite"
                className={`${buttonClass.primary} min-w-[10.5rem] gap-2 transition-all duration-200 ease-out ${
                  showSavedConfirmation && !isPending
                    ? "scale-[1.03] border border-emerald-500/45 bg-emerald-950/55 !text-emerald-100 shadow-md shadow-emerald-950/40 disabled:cursor-default disabled:opacity-100"
                    : ""
                }`}
              >
                {isPending ? (
                  <>
                    <Loader2
                      className="h-4 w-4 shrink-0 animate-spin opacity-90"
                      aria-hidden
                    />
                    <span>Saving...</span>
                  </>
                ) : showSavedConfirmation ? (
                  <>
                    <Check
                      className="h-4 w-4 shrink-0 text-emerald-400"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>Log Workout</span>
                )}
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
    <MuscleRankUpModal
      open={rankUpModal.open}
      payload={rankUpModal.payload}
      onClose={rankUpModal.dismiss}
    />
    </>
  );
}
