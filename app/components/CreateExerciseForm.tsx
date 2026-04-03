"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createExercise } from "@/app/actions/exercises";
import type { Category } from "@/lib/types";
import { buttonClass } from "@/app/components/Button";
import { normalizeLoadType, type LoadType } from "@/lib/loadType";
import { useToast } from "@/app/components/Toast";

function formAction(_: { error?: string } | undefined, formData: FormData) {
  return createExercise(formData);
}

/** Brief “Added” label on the main control; navigation and toast run immediately. */
const ADDED_LABEL_MS = 400;

export function CreateExerciseForm({
  categories,
  buttonLabel = "Add Exercise",
}: {
  categories: Category[];
  buttonLabel?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, action, isPending] = useActionState(formAction, undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [loadType, setLoadType] = useState<LoadType>("weight");
  const [showAdded, setShowAdded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  /** True while a server action is in flight; used to detect success when isPending flips false. */
  const hadPendingSubmissionRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    queueMicrotask(() => setLoadType("weight"));
  }, [isOpen]);

  useEffect(() => {
    if (isPending) hadPendingSubmissionRef.current = true;
  }, [isPending]);

  useEffect(() => {
    if (isPending || !hadPendingSubmissionRef.current) return;
    hadPendingSubmissionRef.current = false;

    if (state?.error) return;

    const categoryId = formRef.current?.querySelector<HTMLSelectElement>(
      '[name="category_id"]'
    )?.value;

    queueMicrotask(() => {
      setShowAdded(true);
      setIsOpen(false);
      formRef.current?.reset();
      toast.show("Exercise added");
      if (categoryId) router.push(`/exercises?expand=${categoryId}`);
    });
    const t = window.setTimeout(() => {
      setShowAdded(false);
    }, ADDED_LABEL_MS);

    return () => clearTimeout(t);
  }, [isPending, state, router, toast]);

  useEffect(() => {
    if (isOpen) queueMicrotask(() => setShowAdded(false));
  }, [isOpen]);

  function handleCancel() {
    setIsOpen(false);
    formRef.current?.reset();
  }

  const submitLocked = isPending;
  const submitLabel = isPending ? "Adding…" : "Add";
  const headerLabel = showAdded ? "Added" : buttonLabel;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={isPending}
        aria-expanded={isOpen}
        aria-controls="add-exercise-form"
        id="add-exercise-btn"
        className={buttonClass.primary}
      >
        {headerLabel}
      </button>

      <div
        id="add-exercise-form"
        role="region"
        aria-labelledby="add-exercise-btn"
        className="grid expand-collapse"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className="transition-opacity duration-[220ms] ease-in-out"
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
                <div className="w-full shrink-0 space-y-1 sm:w-44">
                  <label htmlFor="load_type" className="block text-xs text-zinc-500">
                    Load Type
                  </label>
                  <select
                    id="load_type"
                    name="load_type"
                    value={loadType}
                    onChange={(e) => setLoadType(normalizeLoadType(e.target.value))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="weight">Both arms / total weight</option>
                    <option value="unilateral">One arm / per side</option>
                    <option value="bodyweight">Bodyweight</option>
                    <option value="timed">Timed hold</option>
                  </select>
                </div>
                {loadType !== "bodyweight" && loadType !== "timed" && (
                  <>
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
                        required
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
                        required
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-2 sm:items-end">
                  <button
                    type="submit"
                    disabled={submitLocked}
                    aria-busy={isPending}
                    className={`${buttonClass.primary} min-w-[6.25rem]`}
                  >
                    {submitLabel}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isPending}
                    className={buttonClass.secondary}
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
    </div>
  );
}
