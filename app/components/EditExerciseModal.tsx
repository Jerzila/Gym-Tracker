"use client";

import { useActionState, useEffect, useRef } from "react";
import { updateExercise } from "@/app/actions/exercises";
import type { Exercise, Category } from "@/lib/types";

function formAction(_: { error?: string } | undefined, formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing exercise id" };
  return updateExercise(id, formData);
}

export function EditExerciseModal({
  exercise,
  categories,
  onClose,
  onSuccess,
}: {
  exercise: Exercise;
  categories: Category[];
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-exercise-title"
    >
      <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
        <h3 id="edit-exercise-title" className="text-sm font-medium text-zinc-100">
          Edit exercise
        </h3>
        <form ref={formRef} action={action} className="mt-4 space-y-3">
          <input type="hidden" name="id" value={exercise.id} />
          <div className="space-y-1">
            <label htmlFor="edit-category_id" className="block text-xs text-zinc-500">
              Category
            </label>
            <select
              id="edit-category_id"
              name="category_id"
              required
              defaultValue={exercise.category_id}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
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
          {state?.error && (
            <p className="text-sm text-red-400">{state.error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
