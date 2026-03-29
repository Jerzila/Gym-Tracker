"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { updateExercise } from "@/app/actions/exercises";
import { useLockBodyScroll } from "@/app/lib/useLockBodyScroll";
import type { Exercise } from "@/lib/types";

function formAction(_: { error?: string } | undefined, formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing exercise id" };
  return updateExercise(id, formData);
}

export function EditExerciseModal({
  exercise,
  onClose,
  onSuccess,
}: {
  exercise: Exercise;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [state, action] = useActionState(formAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error) {
      onSuccess();
      onClose();
    }
  }, [state, onSuccess, onClose]);

  useLockBodyScroll(true);

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto overscroll-none bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-exercise-title"
    >
      <div className="my-auto w-full max-w-sm max-h-[min(90dvh,100%)] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
        <h3 id="edit-exercise-title" className="text-sm font-medium text-zinc-100">
          Edit exercise
        </h3>
        <form ref={formRef} action={action} className="mt-4 space-y-3">
          <input type="hidden" name="id" value={exercise.id} />
          <div className="space-y-1">
            <label htmlFor="edit-name" className="block text-xs text-zinc-500">
              Name
            </label>
            <input
              id="edit-name"
              name="name"
              type="text"
              required
              defaultValue={exercise.name}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label htmlFor="edit-rep_min" className="block text-xs text-zinc-500">
                Rep min
              </label>
              <input
                id="edit-rep_min"
                name="rep_min"
                type="number"
                min={1}
                required
                defaultValue={exercise.rep_min}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label htmlFor="edit-rep_max" className="block text-xs text-zinc-500">
                Rep max
              </label>
              <input
                id="edit-rep_max"
                name="rep_max"
                type="number"
                min={1}
                required
                defaultValue={exercise.rep_max}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="edit-load_type" className="block text-xs text-zinc-500">
              Load Type
            </label>
            <select
              id="edit-load_type"
              name="load_type"
              defaultValue={exercise.load_type ?? "bilateral"}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="bilateral">Both arms / total weight</option>
              <option value="unilateral">One arm / per side</option>
            </select>
          </div>
          {state?.error && (
            <p className="text-sm text-red-400">{state.error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-sm text-zinc-400 transition-[transform,filter,background-color] duration-[100ms] ease-out active:scale-[0.98] active:brightness-95 hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-zinc-950 transition-[transform,filter,background-color] duration-[100ms] ease-out active:scale-[0.98] active:brightness-95 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-900 cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
