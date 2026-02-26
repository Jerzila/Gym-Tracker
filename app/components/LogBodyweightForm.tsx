"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBodyweightLog } from "@/app/actions/bodyweight";
import { DatePicker } from "@/app/components/DatePicker";

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950";

export function LogBodyweightForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (fd: FormData) => {
    setError(null);
    const result = await createBodyweightLog(fd);
    if (result?.error) {
      setError(result.error);
      return;
    }
    startTransition(() => {
      router.refresh();
      setExpanded(false);
    });
  };

  return (
    <div className="space-y-3">
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={primaryButtonClass}
        >
          Log Bodyweight
        </button>
      )}

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <form
            action={handleSubmit}
            className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label htmlFor="bodyweight-kg" className="block text-xs text-zinc-500">
                  Weight (kg)
                </label>
                <input
                  id="bodyweight-kg"
                  name="weight"
                  type="number"
                  step="0.1"
                  min="1"
                  required
                  placeholder="e.g. 75.5"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="bodyweight-date" className="block text-xs text-zinc-500">
                  Date
                </label>
                <DatePicker
                  id="bodyweight-date"
                  name="date"
                  required
                  disableFuture
                  className="w-full sm:w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="text-sm text-zinc-500 transition hover:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={primaryButtonClass}
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
