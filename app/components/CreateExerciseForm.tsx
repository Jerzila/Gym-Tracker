"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createExercise } from "@/app/actions/exercises";
import type { Category } from "@/lib/types";

function formAction(_: { error?: string } | undefined, formData: FormData) {
  return createExercise(formData);
}

export function CreateExerciseForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [state, action] = useActionState(formAction, undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus Name input when form expands
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => nameInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // On success: collapse, clear form, show toast, auto-expand that category
  useEffect(() => {
    if (state && !state.error) {
      const categoryId = formRef.current?.querySelector<HTMLSelectElement>(
        '[name="category_id"]'
      )?.value;
      setIsOpen(false);
      formRef.current?.reset();
      setShowToast(true);
      const t = setTimeout(() => setShowToast(false), 2500);
      if (categoryId) router.push(`/?expand=${categoryId}`);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  function handleCancel() {
    setIsOpen(false);
    formRef.current?.reset();
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
        aria-expanded={isOpen}
        aria-controls="add-exercise-form"
        id="add-exercise-btn"
      >
        Add Exercise
      </button>

      <div
        id="add-exercise-form"
        role="region"
        aria-labelledby="add-exercise-btn"
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className="transition-[opacity] duration-200 ease-out"
            style={{ opacity: isOpen ? 1 : 0 }}
          >
            <div className="rounded-xl bg-zinc-900/40 px-4 py-4 pt-3">
              <form
                ref={formRef}
                action={action}
                className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="w-full shrink-0 space-y-1 sm:w-36">
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
                <div className="min-w-0 flex-1 space-y-1">
                  <label htmlFor="name" className="block text-xs text-zinc-500">
                    Name
                  </label>
                  <input
                    ref={nameInputRef}
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
                <div className="flex gap-2 sm:items-end">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-lg border border-zinc-600 bg-transparent px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
                  >
                    Cancel
                  </button>
                </div>
              </form>
              {state?.error && (
                <p className="mt-2 text-sm text-red-400">{state.error}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showToast && (
        <p
          role="status"
          className="rounded-lg bg-emerald-950/60 px-3 py-2 text-sm text-emerald-300"
        >
          Exercise added
        </p>
      )}
    </div>
  );
}
