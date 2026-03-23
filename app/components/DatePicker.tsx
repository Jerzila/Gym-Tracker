"use client";

import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import { createPortal } from "react-dom";
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
  const VIEWPORT_PADDING = 8;
  const TRIGGER_GAP = 8;
  const FALLBACK_CALENDAR_HEIGHT = 360;
  const MIN_CALENDAR_HEIGHT = 220;
  const MAX_CALENDAR_WIDTH = 340;

  const today = new Date();
  const initialDate = defaultValue
    ? parseISODate(defaultValue)
    : new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [selected, setSelected] = useState<Date>(initialDate);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const [dialogStyle, setDialogStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const isoValue = toLocalISODateString(selected);

  const handleSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setSelected(date);
      setOpen(false);
    }
  }, [setOpen, setSelected]);

  const positionCalendar = useCallback(() => {
    if (!open || !triggerRef.current || typeof window === "undefined") return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(MAX_CALENDAR_WIDTH, viewportWidth - VIEWPORT_PADDING * 2);

    let left = triggerRect.left;
    if (left + width > viewportWidth - VIEWPORT_PADDING) {
      left = viewportWidth - VIEWPORT_PADDING - width;
    }
    left = Math.max(VIEWPORT_PADDING, left);

    const measuredHeight = dialogRef.current?.offsetHeight ?? FALLBACK_CALENDAR_HEIGHT;
    const spaceBelow = viewportHeight - triggerRect.bottom - TRIGGER_GAP;
    const spaceAbove = triggerRect.top - TRIGGER_GAP;
    const shouldOpenUpward =
      spaceBelow < measuredHeight + VIEWPORT_PADDING && spaceAbove > spaceBelow;
    const availableHeight =
      (shouldOpenUpward ? spaceAbove : spaceBelow) - VIEWPORT_PADDING;
    const maxHeight = Math.max(MIN_CALENDAR_HEIGHT, availableHeight);

    setPlacement(shouldOpenUpward ? "top" : "bottom");
    setDialogStyle({
      position: "fixed",
      left,
      top: shouldOpenUpward
        ? Math.max(VIEWPORT_PADDING, triggerRect.top - TRIGGER_GAP - Math.min(measuredHeight, maxHeight))
        : Math.min(
            viewportHeight - VIEWPORT_PADDING - MIN_CALENDAR_HEIGHT,
            triggerRect.bottom + TRIGGER_GAP,
          ),
      width,
      maxHeight,
      overflowY: "auto",
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const clickedTrigger =
        !!containerRef.current && containerRef.current.contains(target);
      const clickedCalendar = !!dialogRef.current && dialogRef.current.contains(target);
      if (!clickedTrigger && !clickedCalendar) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const handleViewportChange = () => positionCalendar();

    const raf = requestAnimationFrame(positionCalendar);

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, positionCalendar]);

  const startOfToday = getStartOfToday();
  const disabledMatcher = disableFuture ? { after: startOfToday } : undefined;

  const fromYear = today.getFullYear() - 10;
  const toYear = today.getFullYear() + 1;

  const calendar = (
    <div
      ref={dialogRef}
      role="dialog"
      aria-label="Calendar"
      data-placement={placement}
      className="z-[70] origin-top rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl transition-[opacity,transform] duration-200 ease-out"
      style={{
        ...dialogStyle,
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
          day_button:
            "w-9 h-9 rounded-lg text-sm text-zinc-100 hover:bg-zinc-700 focus:bg-amber-500/20 focus:outline-none focus:ring-1 focus:ring-amber-500",
          selected: "!bg-amber-600 !text-zinc-950 hover:!bg-amber-500",
          today: "font-semibold text-amber-400",
          disabled: "opacity-40 cursor-not-allowed",
          outside: "text-zinc-600",
        }}
      />
    </div>
  );

  return (
    <div ref={containerRef} className={`relative overflow-visible ${className}`}>
      <input type="hidden" name={name} value={isoValue} required={required} />
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Choose date"
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-left text-zinc-100 transition-[transform,filter,background-color] duration-[100ms] ease-out active:scale-[0.98] active:brightness-95 hover:bg-zinc-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 sm:w-40"
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
      {typeof document !== "undefined" ? createPortal(calendar, document.body) : null}
    </div>
  );
}
