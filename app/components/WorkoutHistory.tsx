"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteWorkout } from "@/app/actions/workouts";

type WorkoutItem = {
  id: string;
  date: string;
  weight: number;
  sets: { reps: number }[];
};

export function WorkoutHistory({
  workouts,
  exerciseId,
}: {
  workouts: WorkoutItem[];
  exerciseId: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleDelete(workoutId: string) {
    setPendingId(workoutId);
    const { error } = await deleteWorkout(workoutId, exerciseId);
    setPendingId(null);
    setConfirmId(null);
    if (error) {
      // Could show toast; for now just refetch so UI is consistent
    }
    router.refresh();
  }

  return (
    <>
      <ul className="space-y-2">
        {workouts.slice(0, 10).map((w) => (
          <li
            key={w.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm"
          >
            <span>
              <span className="text-zinc-500">{w.date}</span>
              <span className="mx-2">·</span>
              <span className="font-medium">{Number(w.weight)} kg</span>
              <span className="mx-2">×</span>
              <span>{w.sets.map((s) => s.reps).join(", ")}</span>
            </span>
            <button
              type="button"
              onClick={() => setConfirmId(w.id)}
              disabled={!!pendingId}
              className="shrink-0 rounded px-2 py-1 text-xs text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-400 disabled:opacity-50"
              aria-label="Delete workout"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {confirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-workout-title"
        >
          <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
            <h3 id="delete-workout-title" className="text-sm font-medium text-zinc-100">
              Are you sure you want to delete this workout?
            </h3>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="rounded px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmId)}
                disabled={!!pendingId}
                className="rounded px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {pendingId === confirmId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
