"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  getWorkoutsByMonth,
  getPRsForDate,
  type CalendarWorkout,
} from "@/app/actions/workouts";
import { epley1RM } from "@/lib/progression";
import { formatWeight } from "@/lib/formatWeight";
import { SkeletonCalendarGrid } from "@/app/components/Skeleton";

/** Week starts on Monday (index 0 = Monday) */
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDaysInMonth(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const daysInMonth = last.getDate();
  const dayOfWeek = first.getDay();
  const startPad = (dayOfWeek + 6) % 7;
  const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;
  const out: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) out.push(null);
  for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, month - 1, d));
  while (out.length < totalCells) out.push(null);
  return out;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isFuture(d: Date): boolean {
  const today = toDateKey(new Date());
  return toDateKey(d) > today;
}

export function CalendarView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [workouts, setWorkouts] = useState<CalendarWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [prIds, setPrIds] = useState<Set<string>>(new Set());
  const [monthTransitioning, setMonthTransitioning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getWorkoutsByMonth(year, month).then(({ data, error: err }) => {
      if (!cancelled) {
        setWorkouts(data ?? []);
        setError(err ?? null);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, CalendarWorkout[]>();
    for (const w of workouts) {
      const list = map.get(w.date) ?? [];
      list.push(w);
      map.set(w.date, list);
    }
    return map;
  }, [workouts]);

  const daysGrid = useMemo(
    () => getDaysInMonth(year, month),
    [year, month]
  );

  const handleDayClick = (dateKey: string) => {
    setSelectedDate(dateKey);
    setPanelOpen(true);
    const dayWorkouts = workoutsByDate.get(dateKey) ?? [];
    if (dayWorkouts.length === 0) {
      setPrIds(new Set());
      return;
    }
    const sessions = dayWorkouts.map((w) => {
      const bestReps = Math.max(...w.sets.map((s) => s.reps), 0);
      return {
        exercise_id: w.exercise_id,
        estimated1RM: epley1RM(w.weight, bestReps),
      };
    });
    getPRsForDate(dateKey, sessions).then(({ prExerciseIds }) => {
      setPrIds(new Set(prExerciseIds));
    });
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    setSelectedDate(null);
  };

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClosePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const prevMonth = () => {
    setMonthTransitioning(true);
    setTimeout(() => setMonthTransitioning(false), 180);
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    setMonthTransitioning(true);
    setTimeout(() => setMonthTransitioning(false), 180);
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const monthLabel = `${new Date(year, month - 1).toLocaleString("default", { month: "long" })} ${year}`;

  return (
    <>
      <div className="border-b border-zinc-800/60 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            prefetch={true}
            className="text-zinc-500 transition hover:text-zinc-300"
            aria-label="Back to dashboard"
          >
            ←
          </Link>
          <h2 className="text-lg font-semibold tracking-tight">Calendar</h2>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="tap-feedback rounded-lg px-2 py-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 active:scale-[0.98]"
            >
              ←
            </button>
            <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-300">
              {monthLabel}
            </h3>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="tap-feedback rounded-lg px-2 py-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 active:scale-[0.98]"
            >
              →
            </button>
          </div>

          {error && (
            <p className="px-4 py-3 text-sm text-red-400/90">{error}</p>
          )}

          {loading ? (
            <SkeletonCalendarGrid />
          ) : (
          <div
            className="grid grid-cols-7 gap-px border-t border-zinc-800/60 bg-zinc-800/40 p-2 transition-opacity duration-200 ease-out"
            style={{
              opacity: monthTransitioning ? 0.6 : 1,
            }}
          >
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-medium uppercase tracking-wider text-zinc-500"
              >
                {day}
              </div>
            ))}
            {daysGrid.map((d, i) => {
              if (!d) {
                return <div key={`empty-${i}`} className="min-h-[4rem]" />;
              }
              const dateKey = toDateKey(d);
              const dayWorkouts = workoutsByDate.get(dateKey) ?? [];
              const hasWorkout = dayWorkouts.length > 0;
              const future = isFuture(d);
              const isToday = dateKey === toDateKey(new Date());

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => handleDayClick(dateKey)}
                  className={`relative min-h-[4rem] rounded-lg border border-transparent px-1 py-2 text-left transition duration-150 hover:border-zinc-600 hover:bg-zinc-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 ${
                    isToday ? "ring-1 ring-amber-500/50 bg-amber-500/5" : ""
                  }`}
                >
                  <span className="text-sm text-zinc-300">{d.getDate()}</span>
                  {!future && (
                    <span
                      className={`absolute right-1 top-1 text-[10px] leading-none ${
                        hasWorkout
                          ? "opacity-80"
                          : "opacity-40"
                      }`}
                      aria-hidden
                    >
                      {hasWorkout ? "💪" : "😴"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          )}
        </section>
      </main>

      {/* Detail panel overlay */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-day-title"
        className="fixed inset-0 z-50 flex justify-end"
        style={{
          pointerEvents: panelOpen ? "auto" : "none",
        }}
      >
        <div
          className="absolute inset-0 bg-black/50 transition-opacity duration-200 ease-out"
          style={{ opacity: panelOpen ? 1 : 0 }}
          onClick={handleClosePanel}
          onKeyDown={(e) => e.key === "Escape" && handleClosePanel()}
          tabIndex={-1}
          aria-hidden
        />
        <aside
          className="relative flex w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-900 shadow-xl transition-[transform] duration-200 ease-out"
          style={{
            transform: panelOpen ? "translateX(0)" : "translateX(100%)",
          }}
        >
          {selectedDate && (
            <CalendarDayPanel
              dateKey={selectedDate}
              workouts={workoutsByDate.get(selectedDate) ?? []}
              prExerciseIds={prIds}
              onClose={handleClosePanel}
            />
          )}
        </aside>
      </div>
    </>
  );
}

function CalendarDayPanel({
  dateKey,
  workouts,
  prExerciseIds,
  onClose,
}: {
  dateKey: string;
  workouts: CalendarWorkout[];
  prExerciseIds: Set<string>;
  onClose: () => void;
}) {
  const [y, m, day] = dateKey.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  const dateHeader = d.toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const totalSets = workouts.reduce((acc, w) => acc + w.sets.length, 0);
  const totalVolume = workouts.reduce((acc, w) => {
    const setVolume = w.sets.reduce((s, set) => s + w.weight * set.reps, 0);
    return acc + setVolume;
  }, 0);

  return (
    <>
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 id="calendar-day-title" className="text-lg font-semibold text-zinc-100">
            {dateHeader}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {workouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-zinc-400">
              No workout logged on this day.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Rest and recovery are part of progress.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-zinc-800/60 px-3 py-2">
                <p className="text-xs text-zinc-500">Workouts</p>
                <p className="text-sm font-semibold text-zinc-200">{workouts.length}</p>
              </div>
              <div className="rounded-lg bg-zinc-800/60 px-3 py-2">
                <p className="text-xs text-zinc-500">Sets</p>
                <p className="text-sm font-semibold text-zinc-200">{totalSets}</p>
              </div>
              <div className="rounded-lg bg-zinc-800/60 px-3 py-2">
                <p className="text-xs text-zinc-500">Volume</p>
                <p className="text-sm font-semibold text-zinc-200">
                  {formatWeight(totalVolume)} kg
                </p>
              </div>
            </div>

            {prExerciseIds.size > 0 && (
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wider text-amber-400/90">
                  PRs this day
                </p>
                <p className="mt-0.5 text-sm text-zinc-300">
                  {workouts
                    .filter((w) => prExerciseIds.has(w.exercise_id))
                    .map((w) => w.exercise_name)
                    .join(", ")}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Workouts
              </h3>
              <ul className="space-y-3">
                {workouts.map((w) => {
                  const repStr = w.sets.map((s) => s.reps).join(" / ");
                  const bestReps = Math.max(...w.sets.map((s) => s.reps), 0);
                  const est1RM = epley1RM(w.weight, bestReps);
                  const isPR = prExerciseIds.has(w.exercise_id);

                  return (
                    <li
                      key={w.id}
                      className="border-b border-zinc-800/80 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-zinc-200">{w.exercise_name}</p>
                        {isPR && (
                          <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-400">
                            PR
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">
                        {formatWeight(w.weight)} kg × {repStr}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Est. 1RM: {formatWeight(est1RM)} kg
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
}
