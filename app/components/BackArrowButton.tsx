"use client";

import { useRouter } from "next/navigation";

export function BackArrowButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100 tap-feedback"
      aria-label="Go back"
    >
      <span aria-hidden className="text-lg leading-none">
        ←
      </span>
    </button>
  );
}

