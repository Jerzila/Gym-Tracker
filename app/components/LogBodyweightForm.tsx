"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBodyweightLog } from "@/app/actions/bodyweight";
import { DatePicker } from "@/app/components/DatePicker";

export function LogBodyweightForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async (fd) => {
        setError(null);
        const result = await createBodyweightLog(fd);
        if (result?.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
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
      <button
        type="submit"
        className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
      >
        Save
      </button>
      {error && (
        <p className="text-sm text-red-400 sm:col-span-full">{error}</p>
      )}
    </form>
  );
}
