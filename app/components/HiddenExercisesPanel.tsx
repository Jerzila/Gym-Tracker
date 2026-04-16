"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { restoreExercise } from "@/app/actions/exercises";
import { useLockBodyScroll } from "@/app/lib/useLockBodyScroll";
import type { Category, Exercise } from "@/lib/types";
import { buttonClass } from "@/app/components/Button";

export function HiddenExercisesPanel({
  deletedExercises,
  categories,
}: {
  deletedExercises: Exercise[];
  categories: Category[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useLockBodyScroll(open);

  if (deletedExercises.length === 0) return null;

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Uncategorized";

  async function handleRestore(id: string) {
    setPendingId(id);
    const { error } = await restoreExercise(id);
    setPendingId(null);
    if (!error) router.refresh();
  }

  return (
    <>
      <div className="mt-8 flex justify-center border-t border-zinc-800/40 pt-5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[11px] tracking-wide text-zinc-600 underline decoration-zinc-700 underline-offset-2 transition-colors hover:text-zinc-500 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          Removed exercises ({deletedExercises.length})
        </button>
      </div>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto overscroll-none bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hidden-exercises-title"
          >
            <div className="my-auto w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
              <h3 id="hidden-exercises-title" className="text-sm font-medium text-zinc-200">
                Removed exercises
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                These stay out of your main list. Workout history is kept until you restore them.
              </p>
              <ul className="mt-4 max-h-[min(50vh,320px)] space-y-2 overflow-y-auto pr-1">
                {deletedExercises.map((ex) => (
                  <li
                    key={ex.id}
                    className="flex items-center gap-2 rounded-md border border-zinc-800/80 bg-zinc-950/40 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-200">{ex.name}</p>
                      <p className="truncate text-[11px] text-zinc-600">{catName(ex.category_id)}</p>
                    </div>
                    <button
                      type="button"
                      disabled={pendingId === ex.id}
                      onClick={() => handleRestore(ex.id)}
                      className={`${buttonClass.ghost} shrink-0 px-2 py-1 text-xs text-zinc-400 hover:text-amber-400`}
                    >
                      {pendingId === ex.id ? "…" : "Restore"}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => setOpen(false)} className={buttonClass.modalCancel}>
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
