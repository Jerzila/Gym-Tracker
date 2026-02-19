"use client";

import { useActionState } from "react";
import { createWorkout } from "@/app/actions/workouts";
import { DatePicker } from "@/app/components/DatePicker";

type State = { message?: string; error?: string } | undefined;

function formAction(_: State, formData: FormData) {
  const exerciseId = formData.get("exercise_id") as string;
  return createWorkout(exerciseId, formData);
}

type Props = { exerciseId: string; repMin: number; repMax: number };

export function LogWorkoutForm({ exerciseId, repMin, repMax }: Props) {
  const [state, action] = useActionState(formAction, undefined);

  return (
    <form action={action} className="space-y-4">
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
      <button
        type="submit"
        className="w-full rounded-lg bg-amber-600 py-2.5 font-medium text-zinc-950 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
      >
        Save workout
      </button>
      {state?.message && (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
          {state.message}
        </p>
      )}
      {state?.error && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
    </form>
  );
}
