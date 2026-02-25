"use client";

import { useActionState } from "react";
import { createExercise } from "@/app/actions/exercises";
import type { Category } from "@/lib/types";

function formAction(_: { error?: string } | undefined, formData: FormData) {
  return createExercise(formData);
}

export function CreateExerciseForm({ categories }: { categories: Category[] }) {
  const [state, action] = useActionState(formAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
      <div className="w-full sm:w-36 space-y-1 shrink-0">
        <label htmlFor="category_id" className="block text-xs text-zinc-500">
          Category
        </label>
        <select
          id="category_id"
          name="category_id"
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Select…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <label htmlFor="name" className="block text-xs text-zinc-500">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Bench Press"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div className="w-20 space-y-1">
        <label htmlFor="rep_min" className="block text-xs text-zinc-500">
          Rep min
        </label>
        <input
          id="rep_min"
          name="rep_min"
          type="number"
          min={1}
          defaultValue={6}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div className="w-20 space-y-1">
        <label htmlFor="rep_max" className="block text-xs text-zinc-500">
          Rep max
        </label>
        <input
          id="rep_max"
          name="rep_max"
          type="number"
          min={1}
          defaultValue={12}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
      >
        Add
      </button>
      {state?.error && (
        <p className="text-sm text-red-400 sm:col-span-full w-full">{state.error}</p>
      )}
    </form>
  );
}
