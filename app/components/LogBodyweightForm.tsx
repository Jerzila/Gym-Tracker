"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBodyweightLog } from "@/app/actions/bodyweight";
import { DatePicker } from "@/app/components/DatePicker";
import { buttonClass } from "@/app/components/Button";
import { useToast } from "@/app/components/Toast";
import { useUnits } from "@/app/components/UnitsContext";
import { lbToKg } from "@/lib/units";
import { weightUnitLabel } from "@/lib/formatWeight";

const SHOW_SPINNER_AFTER_MS = 300;

export function LogBodyweightForm() {
  const router = useRouter();
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  const [isPending, setIsPending] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!isPending) {
      setShowSpinner(false);
      if (spinnerTimerRef.current) {
        clearTimeout(spinnerTimerRef.current);
        spinnerTimerRef.current = null;
      }
    } else {
      spinnerTimerRef.current = setTimeout(() => setShowSpinner(true), SHOW_SPINNER_AFTER_MS);
    }
    return () => {
      if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
    };
  }, [isPending]);

  const handleSubmit = async (fd: FormData) => {
    setError(null);
    setIsPending(true);
    let body: FormData = fd;
    if (units === "imperial") {
      const weightRaw = fd.get("weight");
      const newFd = new FormData();
      for (const [k, v] of fd.entries()) {
        if (k === "weight" && weightRaw != null) {
          const lb = Number(weightRaw);
          newFd.set(k, Number.isFinite(lb) ? String(lbToKg(lb)) : String(v));
        } else {
          newFd.set(k, v as string | Blob);
        }
      }
      body = newFd;
    }
    const result = await createBodyweightLog(body);
    setIsPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setExpanded(false);
    toast.show("Bodyweight logged");
    router.refresh();
  };

  return (
    <div className="space-y-3">
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={buttonClass.primary}
        >
          Log Bodyweight
        </button>
      )}

      <div
        className="grid expand-collapse"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className="transition-opacity duration-[220ms] ease-in-out"
            style={{ opacity: expanded ? 1 : 0 }}
          >
            <form
              action={handleSubmit}
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1">
                  <label htmlFor="bodyweight-kg" className="block text-xs text-zinc-500">
                    Bodyweight ({weightLabel})
                  </label>
                  <input
                    id="bodyweight-kg"
                    name="weight"
                    type="number"
                    step={units === "metric" ? "0.1" : "0.5"}
                    min={units === "metric" ? "1" : "20"}
                    required
                    placeholder={units === "metric" ? "e.g. 75.5" : "e.g. 165"}
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
                    className={`${buttonClass.ghost} text-sm px-0 py-0`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className={buttonClass.primary}
                  >
                    {showSpinner ? "Saving…" : "Save"}
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
    </div>
  );
}
