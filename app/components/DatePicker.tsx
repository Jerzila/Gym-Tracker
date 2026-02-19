"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

/** Format a Date to local ISO date string (YYYY-MM-DD) for storage and form submission. */
function toLocalISODateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse an ISO date string (YYYY-MM-DD) to a local Date at midnight. */
function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Format for display e.g. "16 Feb 2026". */
function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Start of today; "after" (exclusive) disables tomorrow and later. */
function getStartOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

export type DatePickerProps = {
  /** Form input name (e.g. "date") */
  name: string;
  /** Initial value as ISO date string (YYYY-MM-DD). Defaults to today. */
  defaultValue?: string;
  /** Whether to disable dates after today. */
  disableFuture?: boolean;
  /** Whether the field is required. */
  required?: boolean;
  /** Input id for the trigger (for label association). */
  id?: string;
  /** Extra class names for the wrapper. */
  className?: string;
};

export function DatePicker({
  name,
  defaultValue,
  disableFuture = false,
  required = true,
  id,
  className = "",
}: DatePickerProps) {
  const today = new Date();
  const initialDate = defaultValue
    ? parseISODate(defaultValue)
    : new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [selected, setSelected] = useState<Date>(initialDate);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isoValue = toLocalISODateString(selected);

  const handleSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setSelected(date);
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  const startOfToday = getStartOfToday();
  const disabledMatcher = disableFuture ? { after: startOfToday } : undefined;

  const fromYear = today.getFullYear() - 10;
  const toYear = today.getFullYear() + 1;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input type="hidden" name={name} value={isoValue} required={required} />
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Choose date"
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-left text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 sm:w-40"
      >
        <span>{formatDisplayDate(selected)}</span>
        <svg
          className="h-4 w-4 shrink-0 text-zinc-500 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        role="dialog"
        aria-label="Calendar"
        className="absolute left-0 top-full z-50 mt-1 origin-top rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl transition-[opacity,transform] duration-200 ease-out"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? "scale(1)" : "scale(0.95)",
          pointerEvents: open ? "auto" : "none",
          visibility: open ? "visible" : "hidden",
        }}
      >
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected}
          disabled={disabledMatcher}
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
          required={required}
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
            day_button: "w-9 h-9 rounded-lg text-sm text-zinc-100 hover:bg-zinc-700 focus:bg-amber-500/20 focus:outline-none focus:ring-1 focus:ring-amber-500",
            selected: "!bg-amber-600 !text-zinc-950 hover:!bg-amber-500",
            today: "font-semibold text-amber-400",
            disabled: "opacity-40 cursor-not-allowed",
            outside: "text-zinc-600",
          }}
        />
      </div>
    </div>
  );
}
