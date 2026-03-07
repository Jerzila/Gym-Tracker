"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteExercise } from "@/app/actions/exercises";
import type { Exercise, Category } from "@/lib/types";
import { EditExerciseModal } from "@/app/components/EditExerciseModal";
import { buttonClass } from "@/app/components/Button";

const EXERCISES_SCROLL_KEY = "gym-exercises-scroll";

function ExerciseCardInner({ exercise, categories }: { exercise: Exercise; categories: Category[] }) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [optimisticallyDeleted, setOptimisticallyDeleted] = useState(false);

  async function handleDelete() {
    setOptimisticallyDeleted(true);
    setShowDeleteConfirm(false);
    setDeletePending(true);
    const { error } = await deleteExercise(exercise.id);
    setDeletePending(false);
    if (error) setOptimisticallyDeleted(false);
    if (!error) router.refresh();
  }

  function handleEditSuccess() {
    router.refresh();
  }

  function saveScrollAndNavigate() {
    try {
      sessionStorage.setItem(EXERCISES_SCROLL_KEY, String(window.scrollY));
    } catch {
      // ignore
    }
  }

  if (optimisticallyDeleted) return null;

  return (
    <>
      <li
        className="group flex min-h-[52px] flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 transition-[transform,background-color,border-color] duration-100 ease-out hover:border-zinc-700 hover:bg-zinc-800/50 active:scale-[0.98] active:brightness-95 sm:flex-nowrap tap-feedback"
      >
        <Link
          href={`/exercise/${exercise.id}`}
          prefetch={true}
          onClick={saveScrollAndNavigate}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-4 py-3 sm:flex-none"
          aria-label={`View ${exercise.name} details and log sets`}
        >
          <span className="font-medium text-zinc-100">{exercise.name}</span>
          <span className="ml-2 text-zinc-500">
            {exercise.rep_min}–{exercise.rep_max} reps
          </span>
        </Link>
        <div
          className="flex shrink-0 items-center gap-1.5 px-2 pb-2 sm:pb-0 sm:pl-0 sm:pr-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowEdit(true);
            }}
            className={`${buttonClass.ghost} px-2 py-1.5 text-xs`}
            aria-label="Edit exercise"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className={`${buttonClass.danger} px-2 py-1.5 text-xs`}
            aria-label="Delete exercise"
          >
            Delete
          </button>
        </div>
      </li>

      {showEdit && (
        <EditExerciseModal
          exercise={exercise}
          categories={categories}
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
                className={buttonClass.modalCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deletePending}
                className={buttonClass.modalConfirm}
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

export const ExerciseCard = memo(ExerciseCardInner);
