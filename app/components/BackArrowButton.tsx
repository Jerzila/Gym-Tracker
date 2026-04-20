"use client";

import { usePathname, useRouter } from "next/navigation";
import { APP_HOME, appHref, stripAppPathPrefix } from "@/lib/appRoutes";

export function BackArrowButton() {
  const router = useRouter();
  const pathname = usePathname();
  const p = stripAppPathPrefix(pathname);

  function handleBack() {
    if (p === "/calendar") {
      router.push(APP_HOME);
      return;
    }
    if (p.startsWith("/exercise/")) {
      router.push(appHref("/exercises"));
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

