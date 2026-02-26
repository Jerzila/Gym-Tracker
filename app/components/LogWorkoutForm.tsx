"use client";

import { useState, useActionState, useEffect } from "react";
import { createWorkout } from "@/app/actions/workouts";
import { DatePicker } from "@/app/components/DatePicker";

type State = { message?: string; error?: string } | undefined;

function formAction(_: State, formData: FormData) {
  const exerciseId = formData.get("exercise_id") as string;
  return createWorkout(exerciseId, formData);
}

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950";

type Props = { exerciseId: string; repMin: number; repMax: number };

export function LogWorkoutForm({ exerciseId, repMin, repMax }: Props) {
  const [state, action] = useActionState(formAction, undefined);
  const [expanded, setExpanded] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (state?.message) {
      setExpanded(false);
      setShowConfirmation(true);
      const t = setTimeout(() => setShowConfirmation(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state?.message]);

  return (
    <div className="space-y-3">
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={primaryButtonClass}
        >
          Log Workout
        </button>
      )}

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <form
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
              <div>
                <label htmlFor="weight" className="block text-xs text-zinc-500">
                  Weight (kg)
                </label>
                <input
                  id="weight"
                  name="weight"
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-zinc-500">
                Reps per set ({repMin}–{repMax} target)
              </p>
              <div className="flex flex-wrap gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-14">
                    <label htmlFor={`reps_${i}`} className="block text-xs text-zinc-600">
                      Set {i}
                    </label>
                    <input
                      id={`reps_${i}`}
                      name={`reps_${i}`}
                      type="number"
                      min="0"
                      required={i <= 3}
                      placeholder="0"
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
                className="text-sm text-zinc-500 transition hover:text-zinc-300"
              >
                Cancel
              </button>
              <button type="submit" className={primaryButtonClass}>
                Save workout
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

      {showConfirmation && state?.message && (
        <p
          className="text-sm text-zinc-500"
          role="status"
          aria-live="polite"
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
