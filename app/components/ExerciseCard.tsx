"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteExercise } from "@/app/actions/exercises";
import type { Exercise } from "@/lib/types";
import { EditExerciseModal } from "@/app/components/EditExerciseModal";

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  async function handleDelete() {
    setDeletePending(true);
    const { error } = await deleteExercise(exercise.id);
    setDeletePending(false);
    setShowDeleteConfirm(false);
    if (!error) router.refresh();
  }

  function handleEditSuccess() {
    router.refresh();
  }

  return (
    <>
      <li className="group flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 transition hover:border-zinc-700 hover:bg-zinc-800/50">
        <Link
          href={`/exercise/${exercise.id}`}
          className="min-w-0 flex-1 px-4 py-3"
        >
          <span className="font-medium">{exercise.name}</span>
          <span className="ml-2 text-zinc-500">
            {exercise.rep_min}–{exercise.rep_max} reps
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 pr-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShowEdit(true);
            }}
            className="rounded px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Edit exercise"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShowDeleteConfirm(true);
            }}
            className="rounded px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Delete exercise"
          >
            Delete
          </button>
        </div>
      </li>

      {showEdit && (
        <EditExerciseModal
          exercise={exercise}
          onClose={() => setShowEdit(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-exercise-title"
        >
          <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
            <h3 id="delete-exercise-title" className="text-sm font-medium text-zinc-100">
              Delete &quot;{exercise.name}&quot;? This will remove the exercise and all its workout history.
            </h3>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deletePending}
                className="rounded px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {deletePending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
