"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { claimAffiliateCode } from "@/app/actions/affiliate";
import { haptic } from "@/lib/haptic";

const RESTORE_SAVED_CODE_MS = 550;

function normalizeAffiliateCode(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

function AffiliateFeedbackIcon({ variant }: { variant: "success" | "error" }) {
  if (variant === "success") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-400"
        aria-hidden
      >
        <path d="M20 6 9 17 4 12" />
      </svg>
    );
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className="text-red-400"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6 18 18" />
    </svg>
  );
}

type Props = {
  /** Server-known saved code (prefills input; updates after successful apply). */
  savedAffiliateCode?: string | null;
  /** Called after a successful claim (e.g. update parent shell state). */
  onClaimed?: () => void;
  /** Compact layout for smaller paywall grids. */
  compact?: boolean;
};

export function AffiliateCodeSection({
  savedAffiliateCode = null,
  onClaimed,
  compact = false,
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState(() => savedAffiliateCode ?? "");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "restored" | "error" | null>(null);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSuccessfulCodeRef = useRef<string | null>(null);

  const clearRestoreTimer = () => {
    if (restoreTimerRef.current) {
      clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }
  };

  useEffect(() => {
    clearRestoreTimer();
    setValue(savedAffiliateCode ?? "");
    setFeedback((current) => {
      const normalizedSavedCode = normalizeAffiliateCode(savedAffiliateCode);
      if (!normalizedSavedCode) return null;
      return current === "success" && lastSuccessfulCodeRef.current === normalizedSavedCode ? "success" : null;
    });
  }, [savedAffiliateCode]);

  useEffect(() => {
    return () => clearRestoreTimer();
  }, []);

  const apply = async () => {
    clearRestoreTimer();
    setFeedback(null);
    const trimmed = value.trim();
    if (!trimmed) {
      lastSuccessfulCodeRef.current = null;
      setFeedback("error");
      return;
    }
    setPending(true);
    try {
      const result = await claimAffiliateCode(trimmed);
      if (result.ok) {
        haptic();
        lastSuccessfulCodeRef.current = normalizeAffiliateCode(trimmed);
        setValue(trimmed);
        setFeedback("success");
        onClaimed?.();
        router.refresh();
      } else if (result.rpcError === "invalid_code_unchanged" && savedAffiliateCode) {
        lastSuccessfulCodeRef.current = normalizeAffiliateCode(savedAffiliateCode);
        setFeedback("error");
        restoreTimerRef.current = setTimeout(() => {
          restoreTimerRef.current = null;
          setValue(savedAffiliateCode);
          setFeedback("restored");
        }, RESTORE_SAVED_CODE_MS);
      } else {
        lastSuccessfulCodeRef.current = null;
        setFeedback("error");
      }
    } finally {
      setPending(false);
    }
  };

  const statusLabel =
    feedback === "success"
      ? "Partner code applied."
      : feedback === "restored"
        ? "Your saved partner code is still active."
        : feedback === "error"
          ? "Code not recognized or invalid."
          : null;

  return (
    <div className={`space-y-1.5 ${compact ? "" : "min-[390px]:space-y-2"}`}>
      <p
        className={`text-center font-medium text-zinc-500 ${compact ? "text-[10px]" : "text-[11px] min-[390px]:text-xs"}`}
      >
        Affiliate code{" "}
        <span className="font-normal text-zinc-600">(optional)</span>
      </p>
      <div className="flex gap-1.5 min-[390px]:gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            name="affiliate_code"
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="e.g. PARTNER"
            value={value}
            onChange={(e) => {
              clearRestoreTimer();
              lastSuccessfulCodeRef.current = null;
              setValue(e.target.value);
              setFeedback(null);
            }}
            disabled={pending}
            className={`w-full rounded-xl border border-white/[0.12] bg-zinc-900/80 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 min-[390px]:text-sm ${
              feedback ? "pl-2.5 pr-10 min-[390px]:pl-3 min-[390px]:pr-11" : "px-2.5 min-[390px]:px-3"
            }`}
          />
          {feedback ? (
            <span
              className="pointer-events-none absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center min-[390px]:right-2.5"
              aria-hidden
            >
              <AffiliateFeedbackIcon variant={feedback === "error" ? "error" : "success"} />
            </span>
          ) : null}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => void apply()}
          className="shrink-0 rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-[12px] font-semibold text-zinc-200 transition-colors hover:bg-white/[0.1] disabled:opacity-50 min-[390px]:px-4 min-[390px]:text-sm tap-feedback"
        >
          {pending ? "…" : "Apply"}
        </button>
      </div>
      {statusLabel ? (
        <p className="sr-only" role="status">
          {statusLabel}
        </p>
      ) : null}
    </div>
  );
}
