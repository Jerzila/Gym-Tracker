"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteBodyweightLog } from "@/app/actions/bodyweight";
import { formatWeight } from "@/lib/formatWeight";
import type { BodyweightLog } from "@/lib/types";

export function BodyweightHistoryList({ logs }: { logs: BodyweightLog[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setPendingId(id);
    const { error } = await deleteBodyweightLog(id);
    setPendingId(null);
    setConfirmId(null);
    if (!error) router.refresh();
  }

  return (
    <>
      <ul className="space-y-2">
        {logs.map((log) => (
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
              className="shrink-0 rounded px-2 py-1 text-xs text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-400 disabled:opacity-50"
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
