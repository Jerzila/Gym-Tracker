"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createWorkout } from "@/app/actions/workouts";
import { DatePicker } from "@/app/components/DatePicker";
import { buttonClass } from "@/app/components/Button";
import { useToast } from "@/app/components/Toast";
import { useWorkoutDataCache } from "@/app/components/WorkoutDataCacheContext";
import { useUnits } from "@/app/components/UnitsContext";
import { lbToKg } from "@/lib/units";
import { weightUnitLabel } from "@/lib/formatWeight";
import type { Exercise } from "@/lib/types";
import { normalizeLoadType } from "@/lib/loadType";

type State = { message?: string; error?: string } | undefined;

type Props = {
  exercise: Exercise;
  onClose: () => void;
  onSuccess?: () => void;
};

function formAction(exerciseId: string) {
  return (_: State, formData: FormData) => createWorkout(exerciseId, formData);
}

const initialSetValues = { weight: "", reps: ["", "", "", "", ""] as string[] };
const initialAdvancedValues = {
  weights: ["", "", "", "", ""] as string[],
  reps: ["", "", "", "", ""] as string[],
};

export function LogSetModal({ exercise, onClose, onSuccess }: Props) {
  const router = useRouter();
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  const lt = normalizeLoadType(exercise.load_type);
  const isBodyweight = lt === "bodyweight";
  const isUnilateral = lt === "unilateral";
  const isTimed = lt === "timed";
  const [state, action, isPending] = useActionState(formAction(exercise.id), undefined);
  const [setValues, setSetValues] = useState(initialSetValues);
  const [advancedLogging, setAdvancedLogging] = useState(false);
  const [advancedValues, setAdvancedValues] = useState(initialAdvancedValues);
  const toast = useToast();
  const cache = useWorkoutDataCache();
  const lastShownRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onCloseRef.current = onClose;
    onSuccessRef.current = onSuccess;
  }, [onClose, onSuccess]);

  useEffect(() => {
    if (state?.message) {
      queueMicrotask(() => {
        setSetValues(initialSetValues);
        setAdvancedValues(initialAdvancedValues);
      });
      cache?.invalidate?.();
      router.refresh();
      if (lastShownRef.current !== state.message) {
        lastShownRef.current = state.message;
        toast.show(state.message);
      }
      onCloseRef.current();
      onSuccessRef.current?.();
    }
  }, [state, toast, cache, router]);

  function handleSubmit() {
    lastShownRef.current = null;
  }

  const today = new Date().toISOString().slice(0, 10);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-set-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="log-set-modal-title" className="text-lg font-semibold text-zinc-100">
          Log set — {exercise.name}
        </h2>
        {!isBodyweight && !isTimed && (
          <p className="mt-0.5 text-sm text-zinc-500">
            {exercise.rep_min}–{exercise.rep_max} reps target
          </p>
        )}

        <form
          action={action}
          onSubmit={handleSubmit}
          className="mt-4 space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="log-modal-date" className="block text-xs text-zinc-500">
                Date
              </label>
              <DatePicker
                id="log-modal-date"
                name="date"
                defaultValue={today}
                disableFuture
                required
                className="mt-1 w-full"
              />
            </div>
          </div>

          <div>
            <div className="flex items-start justify-between gap-3">
              <p className="mb-2 text-xs text-zinc-500">
                {isTimed
                  ? "Log each hold you did; skip empty sets."
                  : isBodyweight
                    ? "Log 1–5 sets; only fill the sets you did."
                    : `Sets (${exercise.rep_min}–${exercise.rep_max} reps target). Log 1–5 sets; only fill the sets you did.`}
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

            {isTimed ? (
              <div className="space-y-3">
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
                          htmlFor={`log-modal-reps_${i}`}
                          className="border-b border-zinc-800/90 py-1 text-center text-[10px] font-semibold tabular-nums text-zinc-500"
                        >
                          {i}
                        </label>
                        <input
                          id={`log-modal-reps_${i}`}
                          name={`reps_${i}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="off"
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
                          className="min-h-[2.35rem] w-full min-w-0 border-0 bg-transparent px-0.5 py-1.5 text-center text-sm tabular-nums leading-none text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                        />
                        <div className="border-t border-zinc-800/80 py-1 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                          sec
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : isBodyweight ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-zinc-600">Reps</p>
                  <div className="mt-1 flex flex-wrap items-end gap-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="w-14">
                        <label htmlFor={`log-modal-reps_${i}`} className="block text-xs text-zinc-600">
                          Set {i}
                        </label>
                        <input
                          id={`log-modal-reps_${i}`}
                          name={`reps_${i}`}
                          type="number"
                          min="0"
                          placeholder="—"
                          value={setValues.reps[i - 1]}
                          onChange={(e) =>
                            setSetValues((prev) => ({
                              ...prev,
                              reps: prev.reps.map((r, j) => (j === i - 1 ? e.target.value : r)),
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-center text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="log-modal-weight" className="block text-xs text-zinc-600">
                    Extra Weight (optional)
                    <span className="font-normal text-zinc-500"> (+{weightLabel})</span>
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
                    id="log-modal-weight"
                    name={units === "metric" ? "weight" : undefined}
                    type="number"
                    min="0"
                    step={units === "metric" ? "0.5" : "1"}
                    placeholder="0"
                    value={setValues.weight}
                    onChange={(e) => setSetValues((prev) => ({ ...prev, weight: e.target.value }))}
                    className="mt-1 w-28 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-center text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="log-modal-weight" className="block text-xs text-zinc-600">
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
                    id="log-modal-weight"
                    name={units === "metric" ? "weight" : undefined}
                    type="number"
                    min="0"
                    step={units === "metric" ? "0.5" : "1"}
                    placeholder="0"
                    value={setValues.weight}
                    onChange={(e) => setSetValues((prev) => ({ ...prev, weight: e.target.value }))}
                    className="mt-1 w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-center text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  {isUnilateral && (
                    <p className="mt-1 text-[11px] text-zinc-500">One arm weight</p>
                  )}
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-14">
                    <label htmlFor={`log-modal-reps_${i}`} className="block text-xs text-zinc-600">
                      Set {i}
                    </label>
                    <input
                      id={`log-modal-reps_${i}`}
                      name={`reps_${i}`}
                      type="number"
                      min="0"
                      placeholder="—"
                      value={setValues.reps[i - 1]}
                      onChange={(e) =>
                        setSetValues((prev) => ({
                          ...prev,
                          reps: prev.reps.map((r, j) => (j === i - 1 ? e.target.value : r)),
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-center text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                    <label htmlFor={`log-modal-adv-reps_${i}`} className="text-xs text-zinc-600">
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
                        id={`log-modal-adv-weight_${i}`}
                        name={units === "metric" ? `weight_${i}` : undefined}
                        type="number"
                        min="0"
                        step={units === "metric" ? "0.5" : "1"}
                        placeholder="0"
                        value={advancedValues.weights[i - 1]}
                        onChange={(e) =>
                          setAdvancedValues((prev) => ({
                            ...prev,
                            weights: prev.weights.map((w, j) => (j === i - 1 ? e.target.value : w)),
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-center text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <input
                      id={`log-modal-adv-reps_${i}`}
                      name={`reps_${i}`}
                      type="number"
                      min="0"
                      placeholder="—"
                      value={advancedValues.reps[i - 1]}
                      onChange={(e) =>
                        setAdvancedValues((prev) => ({
                          ...prev,
                          reps: prev.reps.map((r, j) => (j === i - 1 ? e.target.value : r)),
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-center text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {state?.error && (
            <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={buttonClass.ghost}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={buttonClass.primary}
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Save workout"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
