"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteBodyweightLog } from "@/app/actions/bodyweight";
import { formatWeight } from "@/lib/formatWeight";
import { buttonClass } from "@/app/components/Button";
import type { BodyweightLog } from "@/lib/types";

export function BodyweightHistoryList({ logs }: { logs: BodyweightLog[] }) {
  const router = useRouter();
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const visible = logs.filter((log) => !removedIds.has(log.id));

  async function handleDelete(id: string) {
    setRemovedIds((prev) => new Set(prev).add(id));
    setConfirmId(null);
    setPendingId(id);
    const { error } = await deleteBodyweightLog(id);
    setPendingId(null);
    if (error) setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (!error) router.refresh();
  }

  return (
    <>
      <ul className="space-y-2">
        {visible.map((log) => (
          <li
            key={log.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm"
          >
            <span>
              <span className="text-zinc-500">{log.date}</span>
              <span className="mx-2">·</span>
              <span className="font-medium">{formatWeight(log.weight)} kg</span>
            </span>
            <button
              type="button"
              onClick={() => setConfirmId(log.id)}
              disabled={!!pendingId}
              className={`${buttonClass.ghost} shrink-0 px-2 py-1 text-xs`}
              aria-label="Delete entry"
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
          aria-labelledby="delete-bodyweight-title"
        >
          <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
            <h3 id="delete-bodyweight-title" className="text-sm font-medium text-zinc-100">
              Delete this bodyweight entry?
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
        </div>
      )}
    </>
  );
}
