"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { CalendarIcon } from "@/components/icons";
import { useLockBodyScroll } from "@/app/lib/useLockBodyScroll";

function isoTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function clampISODate(s: string | null | undefined): string | null {
  if (!s) return null;
  const trimmed = String(s).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function parseISODateLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toISODateString(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function formatDisplayDate(iso: string): string {
  return format(parseISODateLocal(iso), "MMM d, yyyy");
}

function CompareDateField({
  id,
  label,
  value,
  onChange,
  minISO,
  maxISO,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (iso: string) => void;
  minISO?: string;
  maxISO?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const minD = minISO ? parseISODateLocal(minISO) : undefined;
  const maxD = maxISO ? parseISODateLocal(maxISO) : undefined;

  const disabledMatchers = [
    ...(minD ? [{ before: minD } as const] : []),
    ...(maxD ? [{ after: maxD } as const] : []),
  ];

  const selected = parseISODateLocal(value);
  const yearNow = new Date().getFullYear();
  const fromYear = minD ? minD.getFullYear() : yearNow - 10;
  const toYear = maxD ? maxD.getFullYear() : yearNow + 1;

  const handleSelect = useCallback(
    (d: Date | undefined) => {
      if (!d) return;
      onChange(toISODateString(d));
      setOpen(false);
    },
    [onChange]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const popover =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[280] flex items-center justify-center p-4" role="presentation">
            <button
              type="button"
              className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
              aria-label="Close calendar"
              onClick={() => setOpen(false)}
            />
            <div
              className="relative z-10 w-full max-w-[340px] rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label={`Choose ${label}`}
            >
              <DayPicker
                mode="single"
                selected={selected}
                onSelect={handleSelect}
                defaultMonth={selected}
                disabled={disabledMatchers.length ? disabledMatchers : undefined}
                captionLayout="dropdown"
                fromYear={fromYear}
                toYear={toYear}
                required
                numberOfMonths={1}
                hideNavigation
                classNames={{
                  root: "rdp-root",
                  months: "rdp-months",
                  month: "rdp-month",
                  month_caption: "rdp-month_caption rdp-caption-single",
                  dropdowns: "rdp-dropdowns rdp-dropdowns-single",
                  dropdown_root: "rdp-dropdown_root",
                  dropdown: "rdp-dropdown",
                  caption_label: "rdp-caption_label",
                  months_dropdown: "rdp-months_dropdown",
                  years_dropdown: "rdp-years_dropdown",
                  nav: "rdp-nav",
                  button_previous: "rdp-button_previous",
                  button_next: "rdp-button_next",
                  month_grid: "rdp-month_grid",
                  weekdays: "rdp-weekdays",
                  weekday: "text-xs text-zinc-500",
                  week: "rdp-week",
                  day: "rdp-day",
                  day_button:
                    "h-9 w-9 rounded-lg text-sm text-zinc-100 transition-colors hover:bg-zinc-700 focus:bg-amber-500/20 focus:outline-none focus:ring-1 focus:ring-amber-500",
                  selected: "!bg-amber-600 !text-zinc-950 hover:!bg-amber-500",
                  today: "font-semibold text-amber-400",
                  disabled: "cursor-not-allowed opacity-40",
                  outside: "text-zinc-600",
                }}
              />
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-100" htmlFor={id}>
        {label}
      </label>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-left text-zinc-100 transition-[transform,background-color] hover:bg-zinc-800/90 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 active:scale-[0.99]"
      >
        <span className="min-w-0 truncate text-sm">{formatDisplayDate(value)}</span>
        <CalendarIcon size={20} className="shrink-0 text-zinc-400" aria-hidden />
      </button>
      {popover}
    </div>
  );
}

export function MuscleProgressCompareModal({
  open,
  onClose,
  earliestWorkoutDate,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  earliestWorkoutDate: string | null;
  onConfirm: (args: { startDate: string; endDate: string }) => void;
}) {
  useLockBodyScroll(open);

  const today = isoTodayUTC();
  const defaultStart = clampISODate(earliestWorkoutDate) ?? today;
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const allowBackdropCloseRef = useRef(false);

  useEffect(() => {
    if (!open) {
      allowBackdropCloseRef.current = false;
      return;
    }
    setError(null);
    setStartDate(defaultStart);
    setEndDate(today);
    allowBackdropCloseRef.current = false;
    const t = window.setTimeout(() => {
      allowBackdropCloseRef.current = true;
    }, 200);
    return () => window.clearTimeout(t);
  }, [open, defaultStart, today]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const canCompare = !!earliestWorkoutDate;

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="muscle-progress-compare-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 tap-feedback"
        aria-label="Close"
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          if (!allowBackdropCloseRef.current) return;
          onClose();
        }}
      />
      <div
        className="relative z-10 flex max-h-[min(92dvh,100%)] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl border border-zinc-800 border-b-0 bg-zinc-900 shadow-xl sm:max-h-[min(90dvh,100%)] sm:rounded-xl sm:border-b"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto overscroll-contain p-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:pb-4">
          <h3
            id="muscle-progress-compare-title"
            className="text-base font-semibold leading-snug text-zinc-100"
          >
            Muscle Progress Comparison
          </h3>
          <p className="mt-1 text-xs text-zinc-500">Compare your muscle strength map between two dates.</p>

          {!canCompare ? (
            <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-sm text-zinc-400">
              Log at least one workout to compare progress.
            </p>
          ) : (
            <div className="mt-5 flex flex-col gap-6">
              <CompareDateField
                id="compare-start-date"
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                maxISO={endDate}
                minISO={clampISODate(earliestWorkoutDate) ?? undefined}
              />
              <CompareDateField
                id="compare-end-date"
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                minISO={startDate}
                maxISO={today}
              />
            </div>
          )}

          {error ? (
            <p className="mt-3 text-xs text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canCompare}
              onClick={() => {
                setError(null);
                const s = clampISODate(startDate);
                const e = clampISODate(endDate);
                if (!s || !e) {
                  setError("Pick valid dates.");
                  return;
                }
                if (s > e) {
                  setError("Start Date must be on/before End Date.");
                  return;
                }
                onConfirm({ startDate: s, endDate: e });
              }}
              className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              Compare
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
