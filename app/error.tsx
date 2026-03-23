"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] uncaught ui error", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-xl font-semibold text-zinc-100">Something went wrong</h2>
      <p className="text-sm text-zinc-400">
        A part of Liftly failed to load. You can retry without leaving this screen.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-800"
      >
        Retry
      </button>
    </div>
  );
}
