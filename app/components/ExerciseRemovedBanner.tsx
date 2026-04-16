"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { restoreExercise } from "@/app/actions/exercises";
import { buttonClass } from "@/app/components/Button";

export function ExerciseRemovedBanner({ exerciseId, exerciseName }: { exerciseId: string; exerciseName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRestore() {
    setError(null);
    setPending(true);
    const { error: err } = await restoreExercise(exerciseId);
    setPending(false);
    if (err) {
      setError(err);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mb-4 rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5">
      <p className="text-xs text-zinc-500">
        <span className="text-zinc-400">&quot;{exerciseName}&quot;</span> is removed from your list. History below is
        unchanged.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={handleRestore}
          className={`${buttonClass.secondary} px-2.5 py-1 text-xs`}
        >
          {pending ? "Restoring…" : "Restore to list"}
        </button>
        {error ? <span className="text-xs text-red-400">{error}</span> : null}
      </div>
    </div>
  );
}
