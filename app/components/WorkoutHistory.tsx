"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { deleteWorkout } from "@/app/actions/workouts";
import { useLockBodyScroll } from "@/app/lib/useLockBodyScroll";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";
import { buttonClass } from "@/app/components/Button";
import { formatLoggedSetsSummary } from "@/lib/formatBodyweightSets";
import { normalizeLoadType, type LoadType } from "@/lib/loadType";

type WorkoutItem = {
  id: string;
  date: string;
  weight: number;
  average_weight?: number | null;
  average_estimated_1rm?: number | null;
  sets: { reps: number; weight?: number | null }[];
};

export function WorkoutHistory({
  workouts,
  exerciseId,
  loadType = "weight",
}: {
  workouts: WorkoutItem[];
  exerciseId: string;
  loadType?: LoadType;
}) {
  const router = useRouter();
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  const isBodyweight = normalizeLoadType(loadType) === "bodyweight";
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  useLockBodyScroll(confirmId !== null);

  const visible = workouts.filter((w) => !removedIds.has(w.id));

  async function handleDelete(workoutId: string) {
    setRemovedIds((prev) => new Set(prev).add(workoutId));
    setConfirmId(null);
    setPendingId(workoutId);
    const { error } = await deleteWorkout(workoutId, exerciseId);
    setPendingId(null);
    if (error) setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(workoutId);
      return next;
    });
    router.refresh();
  }

  return (
    <>
      <ul className="space-y-2">
        {visible.map((w) => (
          <li
            key={w.id}
            className="card-tap flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm"
          >
            <button
              type="button"
              onClick={() => setDetailsId(w.id)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="text-zinc-500">{w.date}</span>
              <span className="mx-2">·</span>
              {(() => {
                if (isBodyweight) {
                  const line = formatLoggedSetsSummary(w.sets, loadType, units, weightLabel);
                  return <span className="font-medium">{line}</span>;
                }
                const fallbackWeight = Number(w.weight) || 0;
                const weights = (w.sets ?? [])
                  .map((s) => (s.weight != null ? Number(s.weight) : fallbackWeight))
                  .filter((x) => Number.isFinite(x) && x > 0);
                const distinct = new Set(weights.map((x) => x)).size;
                const isMultiWeight = distinct > 1;

                if (!isMultiWeight) {
                  const displayW = weights.length > 0 ? weights[0] : fallbackWeight;
                  return (
                    <>
                      <span className="font-medium">
                        {formatWeight(Number(displayW), { units })} {weightLabel}
                      </span>
                      <span className="mx-2">×</span>
                      <span>{w.sets.map((s) => s.reps).join(", ")}</span>
                    </>
                  );
                }

                const setList = (w.sets ?? [])
                  .map((s) => {
                    const wKg = s.weight != null ? Number(s.weight) : fallbackWeight;
                    return `${Number(wKg) || 0}×${Number(s.reps) || 0}`;
                  })
                  .join(" • ");

                return (
                  <>
                    <span className="font-medium">{setList}</span>
                  </>
                );
              })()}
            </button>
            <button
              type="button"
              onClick={() => setConfirmId(w.id)}
              disabled={!!pendingId}
              className={`${buttonClass.ghost} shrink-0 px-2 py-1 text-xs`}
              aria-label="Delete workout"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {detailsId &&
        (() => {
          const w = visible.find((x) => x.id === detailsId);
          if (!w) return null;
          const fallbackWeight = Number(w.weight) || 0;
          const weights = (w.sets ?? [])
            .map((s) => (s.weight != null ? Number(s.weight) : fallbackWeight))
            .filter((x) => Number.isFinite(x) && x > 0);
          const extras = (w.sets ?? []).map((s) =>
            s.weight != null && Number.isFinite(Number(s.weight)) ? Math.max(0, Number(s.weight)) : 0
          );
          const avgExtra =
            extras.length > 0 ? extras.reduce((a, b) => a + b, 0) / extras.length : 0;
          const avgW =
            w.average_weight != null && Number.isFinite(Number(w.average_weight)) && Number(w.average_weight) > 0
              ? Number(w.average_weight)
              : weights.length > 0
                ? weights.reduce((a, b) => a + b, 0) / weights.length
                : fallbackWeight;
          const avg1 =
            w.average_estimated_1rm != null && Number.isFinite(Number(w.average_estimated_1rm)) && Number(w.average_estimated_1rm) > 0
              ? Number(w.average_estimated_1rm)
              : null;
          return createPortal(
            <div
              className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto overscroll-none bg-black/60 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="workout-details-title"
              onClick={(e) => e.target === e.currentTarget && setDetailsId(null)}
            >
              <div className="my-auto w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
                <h3 id="workout-details-title" className="text-sm font-medium text-zinc-100">
                  Workout details
                </h3>
                <p className="mt-1 text-xs text-zinc-500">{w.date}</p>

                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Sets</p>
                  <div className="space-y-1">
                    {isBodyweight
                      ? (w.sets ?? []).map((s, idx) => {
                          const r = Number(s.reps) || 0;
                          const ex =
                            s.weight != null && Number.isFinite(Number(s.weight))
                              ? Math.max(0, Number(s.weight))
                              : 0;
                          return (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-zinc-300">
                                {ex > 0
                                  ? `${formatWeight(ex, { units, signed: true })} ${weightLabel} × ${r}`
                                  : `${r} reps`}
                              </span>
                            </div>
                          );
                        })
                      : (w.sets ?? []).map((s, idx) => {
                          const wKg = s.weight != null ? Number(s.weight) : fallbackWeight;
                          return (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-zinc-300">
                                {formatWeight(Number(wKg), { units })} {weightLabel}
                              </span>
                              <span className="text-zinc-400">× {Number(s.reps) || 0}</span>
                            </div>
                          );
                        })}
                  </div>
                </div>

                <div className="mt-4 space-y-1 text-sm text-zinc-300">
                  {!isBodyweight && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Avg weight</span>
                      <span>
                        {formatWeight(Number(avgW), { units })} {weightLabel}
                      </span>
                    </div>
                  )}
                  {isBodyweight && extras.some((e) => e > 0) && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Avg extra weight</span>
                      <span>
                        {formatWeight(Number(avgExtra), { units })} {weightLabel}
                      </span>
                    </div>
                  )}
                  {avg1 != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Est. 1RM</span>
                      <span>
                        {formatWeight(Number(avg1), { units })} {weightLabel}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex justify-end">
                  <button type="button" onClick={() => setDetailsId(null)} className={buttonClass.modalCancel}>
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          );
        })()}

      {confirmId &&
        createPortal(
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto overscroll-none bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-workout-title"
          >
            <div className="my-auto w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
              <h3 id="delete-workout-title" className="text-sm font-medium text-zinc-100">
                Are you sure you want to delete this workout?
              </h3>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  className={buttonClass.modalCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(confirmId)}
                  disabled={!!pendingId}
                  className={buttonClass.modalConfirm}
                >
                  {pendingId === confirmId ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
