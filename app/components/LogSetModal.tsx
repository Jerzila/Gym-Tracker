"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { createWorkout } from "@/app/actions/workouts";
import { DatePicker } from "@/app/components/DatePicker";
import { buttonClass } from "@/app/components/Button";
import { useToast } from "@/app/components/Toast";
import { useWorkoutDataCache } from "@/app/components/WorkoutDataCacheContext";
import type { Exercise } from "@/lib/types";

type State = { message?: string; error?: string } | undefined;

type Props = {
  exercise: Exercise;
  onClose: () => void;
  onSuccess?: () => void;
};

function formAction(exerciseId: string) {
  return (_: State, formData: FormData) => createWorkout(exerciseId, formData);
}

const SHOW_SPINNER_AFTER_MS = 300;
const initialSetValues = { weight: "", reps: ["", "", "", "", ""] as string[] };

export function LogSetModal({ exercise, onClose, onSuccess }: Props) {
  const [state, action] = useActionState(formAction(exercise.id), undefined);
  const [setValues, setSetValues] = useState(initialSetValues);
  const [showSpinner, setShowSpinner] = useState(false);
  const spinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();
  const cache = useWorkoutDataCache();
  const lastShownRef = useRef<string | null>(null);

  useEffect(() => {
    if (state?.message) {
      setSetValues(initialSetValues);
      cache?.invalidate?.();
      if (lastShownRef.current !== state.message) {
        lastShownRef.current = state.message;
        toast.show(state.message);
      }
      onClose();
      onSuccess?.();
    }
    if (state?.message || state?.error) {
      setShowSpinner(false);
      if (spinnerTimerRef.current) {
        clearTimeout(spinnerTimerRef.current);
        spinnerTimerRef.current = null;
      }
    }
  }, [state?.message, state?.error, toast, onClose, onSuccess]);

  function handleSubmit() {
    lastShownRef.current = null;
    setShowSpinner(false);
    if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
    spinnerTimerRef.current = setTimeout(() => setShowSpinner(true), SHOW_SPINNER_AFTER_MS);
  }

  const today = new Date().toISOString().slice(0, 10);

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
        <p className="mt-0.5 text-sm text-zinc-500">
          {exercise.rep_min}–{exercise.rep_max} reps target
        </p>

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
            <p className="mb-2 text-xs text-zinc-500">
              Sets ({exercise.rep_min}–{exercise.rep_max} reps target). Log 1–5 sets; only fill the sets you did.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="log-modal-weight" className="block text-xs text-zinc-600">
                  Weight (kg)
                </label>
                <input
                  id="log-modal-weight"
                  name="weight"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={setValues.weight}
                  onChange={(e) => setSetValues((prev) => ({ ...prev, weight: e.target.value }))}
                  className="mt-1 w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-center text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
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
            </div>
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
              disabled={showSpinner}
            >
              {showSpinner ? "Saving…" : "Save workout"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
