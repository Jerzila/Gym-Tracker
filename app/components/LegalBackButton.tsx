"use client";

import { useRouter } from "next/navigation";

export function LegalBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100 tap-feedback"
      aria-label="Go back"
    >
      <span aria-hidden>←</span>
      Back
    </button>
  );
}
