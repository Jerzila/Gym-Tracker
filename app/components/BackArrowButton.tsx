"use client";

import { usePathname, useRouter } from "next/navigation";

export function BackArrowButton() {
  const router = useRouter();
  const pathname = usePathname();

  function handleBack() {
    if (pathname.startsWith("/exercise/")) {
      router.push("/exercises");
      return;
    }
    router.back();
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100 tap-feedback"
      aria-label="Go back"
    >
      <span aria-hidden className="text-lg leading-none">
        ←
      </span>
    </button>
  );
}

