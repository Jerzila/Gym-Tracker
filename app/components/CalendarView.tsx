"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  getWorkoutsByMonth,
  getWorkoutCountsByPeriod,
  getPRsForDate,
  type CalendarWorkout,
} from "@/app/actions/workouts";
import { resolveBodyweightKgFromLogs } from "@/lib/bodyweightAsOf";
import { formatLoggedSetsSummary } from "@/lib/formatBodyweightSets";
import { formatDurationClock, formatDurationTooltip } from "@/lib/formatDuration";
import {
  sessionEstimated1RMFromSets,
  sessionVolumeKgFromSets,
  type SessionSetRow,
} from "@/lib/sessionStrength";
import { normalizeLoadType } from "@/lib/loadType";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";
import { useProAccess } from "@/app/components/ProAccessProvider";
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

type BodyweightCalendarContext = {
  profileKg: number;
  logsAsc: { date: string; weight: number }[];
};

const emptyBwContext: BodyweightCalendarContext = { profileKg: 0, logsAsc: [] };

export function CalendarView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  const { hasPro, monthlyAnalyticsUnlocked, requirePro, ready: proReady } = useProAccess();
  /** Until subscription seed + RC sync finish, avoid false "locked" for trial users. */
  const fullCalendarAccess = !proReady || hasPro || monthlyAnalyticsUnlocked;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [workouts, setWorkouts] = useState<CalendarWorkout[]>([]);
  const [bodyweightContext, setBodyweightContext] =
    useState<BodyweightCalendarContext>(emptyBwContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [prIds, setPrIds] = useState<Set<string>>(new Set());
  const [monthTransitioning, setMonthTransitioning] = useState(false);
  const [counts, setCounts] = useState<{
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWorkoutCountsByPeriod().then(({ data, error: err }) => {
      if (!cancelled && data) setCounts(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!proReady || fullCalendarAccess) return;
    const n = new Date();
    const cy = n.getFullYear();
    const cm = n.getMonth() + 1;
    Promise.resolve().then(() => {
      setYear(cy);
      setMonth(cm);
    });
  }, [proReady, fullCalendarAccess]);

  useEffect(() => {
    let cancelled = false;
    // Avoid setting state synchronously inside the effect body.
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });
    getWorkoutsByMonth(year, month).then(({ data, error: err }) => {
      if (!cancelled) {
        setWorkouts(data?.workouts ?? []);
        setBodyweightContext(data?.bodyweightContext ?? emptyBwContext);
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
    if (!fullCalendarAccess) {
      requirePro("calendar");
      return;
    }
    setSelectedDate(dateKey);
    setPanelOpen(true);
    router.replace(`${pathname}?date=${dateKey}`, { scroll: false });
    const dayWorkouts = workoutsByDate.get(dateKey) ?? [];
    if (dayWorkouts.length === 0) {
      setPrIds(new Set());
      return;
    }
    const sessions = dayWorkouts.map((w) => {
      const stored = w.estimated_1rm;
      if (stored != null && Number.isFinite(Number(stored)) && Number(stored) > 0) {
        return { exercise_id: w.exercise_id, estimated1RM: Number(stored) };
      }
      const lt = normalizeLoadType(w.load_type);
      if (lt === "timed") {
        const sessionMax = (w.sets as SessionSetRow[]).reduce(
          (m, s) => Math.max(m, Number(s.reps) || 0),
          0
        );
        return { exercise_id: w.exercise_id, estimated1RM: sessionMax };
      }
      const bwAt =
        lt === "bodyweight"
          ? resolveBodyweightKgFromLogs(dateKey, bodyweightContext.logsAsc, bodyweightContext.profileKg)
          : 0;
      return {
        exercise_id: w.exercise_id,
        estimated1RM: sessionEstimated1RMFromSets(
          w.sets as SessionSetRow[],
          Number(w.weight) || 0,
          lt,
          lt === "bodyweight"
            ? {
                userBodyweightKg: bwAt,
                bodyweightLoadFraction: w.bodyweight_load_fraction ?? 1,
              }
            : undefined
        ),
      };
    });
    getPRsForDate(dateKey, sessions).then(({ prExerciseIds }) => {
      setPrIds(new Set(prExerciseIds));
    });
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    setSelectedDate(null);
    router.replace(pathname, { scroll: false });
  };

  useEffect(() => {
    const dateFromQuery = searchParams.get("date");
    // Avoid setting state synchronously inside the effect body.
    Promise.resolve().then(() => {
      if (dateFromQuery) {
        if (!fullCalendarAccess) {
          const parts = dateFromQuery.split("-").map(Number);
          const y = parts[0];
          const m = parts[1];
          const n = new Date();
          if (
            !Number.isFinite(y) ||
            !Number.isFinite(m) ||
            y !== n.getFullYear() ||
            m !== n.getMonth() + 1
          ) {
            router.replace(pathname, { scroll: false });
            return;
          }
        }
        setSelectedDate(dateFromQuery);
        setPanelOpen(true);
      } else {
        setPanelOpen(false);
        setSelectedDate(null);
      }
    });
  }, [searchParams, fullCalendarAccess, pathname, router]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClosePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const prevMonth = () => {
    if (!fullCalendarAccess) {
      requirePro("calendar");
      return;
    }
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
    if (!fullCalendarAccess) {
      requirePro("calendar");
      return;
    }
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
    <div className="w-full max-w-[100vw] overflow-x-hidden">
      <main className="mx-auto w-full min-w-0 max-w-2xl px-4 py-6 sm:px-6">
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="w-full min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-center">
            <p className="break-words text-xs font-medium uppercase tracking-wider text-zinc-500">
              This Week
            </p>
            <p className="mt-1 whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-200 sm:text-base">
              {counts !== null ? counts.thisWeek : "—"} workouts
            </p>
          </div>
          <div className="w-full min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-center">
            <p className="break-words text-xs font-medium uppercase tracking-wider text-zinc-500">
              This Month
            </p>
            <p className="mt-1 whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-200 sm:text-base">
              {counts !== null ? counts.thisMonth : "—"} workouts
            </p>
          </div>
          <div className="w-full min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-center">
            <p className="break-words text-xs font-medium uppercase tracking-wider text-zinc-500">
              This Year
            </p>
            <p className="mt-1 whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-200 sm:text-base">
              {counts !== null ? counts.thisYear : "—"} workouts
            </p>
          </div>
        </div>

        <section className="w-full min-w-0 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
          <div className="calendar-header flex w-full items-center justify-between border-b border-zinc-800/60 px-4 py-3 min-w-0">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className={`tap-feedback shrink-0 rounded-lg px-2 py-1.5 transition hover:bg-zinc-800 ${
                fullCalendarAccess
                  ? "text-zinc-400 hover:text-zinc-200"
                  : "text-zinc-600 hover:text-zinc-500"
              }`}
            >
              ←
            </button>
            <h3 className="min-w-0 flex-1 truncate px-2 text-center text-sm font-medium uppercase tracking-wider text-zinc-300">
              {monthLabel}
            </h3>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className={`tap-feedback shrink-0 rounded-lg px-2 py-1.5 transition hover:bg-zinc-800 ${
                fullCalendarAccess
                  ? "text-zinc-400 hover:text-zinc-200"
                  : "text-zinc-600 hover:text-zinc-500"
              }`}
            >
              →
            </button>
          </div>

          {!fullCalendarAccess ? (
            <p className="border-b border-zinc-800/60 px-4 pb-3 text-center text-xs text-zinc-500">
              After your first free month, opening a day or browsing other months is{" "}
              <span className="font-medium text-amber-400/90">Liftly Pro</span>. This month stays visible
              as a preview.
            </p>
          ) : null}

          {error && (
            <p className="px-4 py-3 text-sm text-red-400/90">{error}</p>
          )}

          {loading ? (
            <SkeletonCalendarGrid />
          ) : (
          <div
            className="grid w-full grid-cols-7 gap-1.5 border-t border-zinc-800/60 bg-zinc-800/40 p-2 transition-opacity duration-200 ease-out"
            style={{
              opacity: monthTransitioning ? 0.6 : 1,
            }}
          >
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="truncate py-2 text-center text-xs font-medium uppercase tracking-wider text-zinc-500"
              >
                {day}
              </div>
            ))}
            {daysGrid.map((d, i) => {
              if (!d) {
                return <div key={`empty-${i}`} className="day-cell aspect-square w-full rounded-[10px]" aria-hidden />;
              }
              const dateKey = toDateKey(d);
              const dayWorkouts = workoutsByDate.get(dateKey) ?? [];
              const hasWorkout = dayWorkouts.length > 0;
              const future = isFuture(d);
              const isToday = dateKey === toDateKey(new Date());
              const isSelected = selectedDate === dateKey;
              const showDot = !future;
              const dotColor = hasWorkout ? "bg-green-500" : "bg-zinc-500";

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => handleDayClick(dateKey)}
                  className={`card-tap day-cell relative flex w-full aspect-square flex-col justify-between items-start rounded-[10px] border px-2 py-2 text-left transition duration-150 hover:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 bg-zinc-900 border-zinc-800 ${
                    isSelected ? "border-amber-400" : ""
                  } ${
                    isToday && !isSelected
                      ? "ring-1 ring-amber-500/50 ring-offset-1 ring-offset-zinc-900"
                      : ""
                  }`}
                >
                  <span className="truncate text-sm font-medium text-zinc-300">
                    {d.getDate()}
                  </span>
                  {showDot && (
                    <span className="flex w-full justify-center" aria-hidden>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          )}

          <div className="flex min-w-0 flex-wrap gap-6 px-4 pb-4 pt-3 text-sm text-zinc-400 border-t border-zinc-800/60 mt-2">
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <span className="w-2 h-2 shrink-0 rounded-full bg-green-500" aria-hidden />
              <span className="truncate">Workout completed</span>
            </span>
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <span className="w-2 h-2 shrink-0 rounded-full bg-zinc-500" aria-hidden />
              <span className="truncate">No workout logged</span>
            </span>
          </div>
        </section>
      </main>

      {/* Detail panel overlay */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-day-title"
        className="fixed inset-0 z-[220] flex justify-end"
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
              bodyweightContext={bodyweightContext}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function CalendarDayPanel({
  dateKey,
  workouts,
  prExerciseIds,
  onClose,
  bodyweightContext,
}: {
  dateKey: string;
  workouts: CalendarWorkout[];
  prExerciseIds: Set<string>;
  onClose: () => void;
  bodyweightContext: BodyweightCalendarContext;
}) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  const [y, m, day] = dateKey.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  const dateHeader = d.toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const totalSets = workouts.reduce((acc, w) => acc + w.sets.length, 0);
  const totalVolume = workouts.reduce((acc, w) => {
    const lt = normalizeLoadType(w.load_type);
    const bwAt =
      lt === "bodyweight"
        ? resolveBodyweightKgFromLogs(dateKey, bodyweightContext.logsAsc, bodyweightContext.profileKg)
        : 0;
    return (
      acc +
      sessionVolumeKgFromSets(
        w.sets as SessionSetRow[],
        Number(w.weight) || 0,
        lt,
        lt === "bodyweight"
          ? {
              userBodyweightKg: bwAt,
              bodyweightLoadFraction: w.bodyweight_load_fraction ?? 1,
            }
          : undefined
      )
    );
  }, 0);

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-zinc-800 bg-[var(--background)] pt-[env(safe-area-inset-top,0px)]"
        role="banner"
      >
        <div className="grid h-14 w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4">
          <span className="min-w-0" />
          <h2
            id="calendar-day-title"
            className="max-w-[min(18rem,72vw)] truncate text-center text-base font-semibold tracking-tight text-zinc-100"
          >
            {dateHeader}
          </h2>
          <div className="flex min-w-0 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="tap-feedback rounded-lg px-2 py-2 text-sm font-medium text-amber-400 transition hover:bg-zinc-800 hover:text-amber-300"
            >
              Done
            </button>
          </div>
        </div>
      </header>

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
                  {formatWeight(totalVolume, { units })} {weightLabel}
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
                  const fallbackW = Number(w.weight) || 0;
                  const lt = normalizeLoadType(w.load_type);
                  const bwSummary = formatLoggedSetsSummary(w.sets, lt, units, weightLabel);
                  const setSummary =
                    lt === "timed"
                      ? w.sets
                          .map((s) => formatDurationTooltip(Number(s.reps) || 0))
                          .join(" · ")
                      : bwSummary ||
                        w.sets
                          .map((s) => {
                            const wKg = s.weight != null ? Number(s.weight) : fallbackW;
                            return `${formatWeight(Number(wKg), { units })} ${weightLabel} × ${Number(s.reps) || 0}`;
                          })
                          .join(" · ");
                  const stored = w.estimated_1rm;
                  const bwAt =
                    lt === "bodyweight"
                      ? resolveBodyweightKgFromLogs(
                          dateKey,
                          bodyweightContext.logsAsc,
                          bodyweightContext.profileKg
                        )
                      : 0;
                  const sessionMaxSec =
                    lt === "timed"
                      ? w.sets.reduce((m, s) => Math.max(m, Number(s.reps) || 0), 0)
                      : 0;
                  const est1RM =
                    lt === "timed"
                      ? sessionMaxSec
                      : stored != null && Number.isFinite(Number(stored)) && Number(stored) > 0
                        ? Number(stored)
                        : sessionEstimated1RMFromSets(
                            w.sets as SessionSetRow[],
                            fallbackW,
                            lt,
                            lt === "bodyweight"
                              ? {
                                  userBodyweightKg: bwAt,
                                  bodyweightLoadFraction: w.bodyweight_load_fraction ?? 1,
                                }
                              : undefined
                          );
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
                      <p className="mt-1 text-sm text-zinc-400">{setSummary}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {lt === "timed" ? (
                          <>
                            Best time:{" "}
                            <span className="tabular-nums text-zinc-400">{formatDurationClock(est1RM)}</span>
                          </>
                        ) : (
                          <>
                            Est. 1RM: {formatWeight(est1RM, { units })} {weightLabel}
                          </>
                        )}
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
