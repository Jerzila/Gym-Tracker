"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAdvancedStrengthAnalytics,
  type AdvancedStrengthAnalyticsPayload,
  type AdvancedStrengthAnalyticsRequest,
  type AdvancedStrengthMetricCard,
} from "@/app/actions/advancedStrengthAnalytics";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { useUnits } from "@/app/components/UnitsContext";
import { useProAccess } from "@/app/components/ProAccessProvider";

/** Card padding ~10–12px */
const CARD_PAD = "px-3 py-2 sm:px-3 sm:py-2.5";
/** Grid gap ~12px */
const CARD_GAP = "gap-3";
/** Label → primary metric */
const TITLE_TO_METRIC = "mb-1";
const SECTION_LABEL =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-[11px]";

const MAIN_GRID_KINDS = [
  "progress",
  "progress_rate",
  "frequency",
  "consistency",
  "best_period",
] as const satisfies readonly AdvancedStrengthMetricCard["kind"][];

const EXTRA_GRID_KINDS = ["pr_frequency", "exercise_rank"] as const satisfies readonly AdvancedStrengthMetricCard["kind"][];

function trendPrimaryClass(t: AdvancedStrengthMetricCard["trend"]): string {
  if (t === "positive") return "text-emerald-400";
  if (t === "negative") return "text-rose-400";
  return "text-amber-300";
}

function formatDeltaWeightKg(deltaKg: number, units: "metric" | "imperial"): string {
  const sign = deltaKg < 0 ? "-" : deltaKg > 0 ? "+" : "";
  const body = formatWeight(Math.abs(deltaKg), { units });
  return `${sign}${body}`;
}

function isMissingMain(card: AdvancedStrengthMetricCard): boolean {
  const t = card.mainText?.trim();
  return !t || t === "—";
}

/** Two-line cards: small label (title) + large primary only; server payloads unchanged. */
function compactMetricPrimary(
  card: AdvancedStrengthMetricCard,
  units: "metric" | "imperial",
  weightLabel: string
): { primary: string; trendClass: string } {
  const neutralMuted = "text-zinc-400";

  if (card.kind === "progress") {
    if (card.rawDeltaKg != null) {
      return {
        primary: `${formatDeltaWeightKg(card.rawDeltaKg, units)} ${weightLabel}`,
        trendClass: trendPrimaryClass(card.trend),
      };
    }
    return {
      primary: "Not enough data yet",
      trendClass: neutralMuted,
    };
  }

  if (card.kind === "progress_rate") {
    if (
      card.rawKgPerMonth != null &&
      card.rawPercentPerMonth != null &&
      card.rawTotalPercentIncrease != null
    ) {
      return {
        primary: `${formatDeltaWeightKg(card.rawKgPerMonth, units)} ${weightLabel}/mo`,
        trendClass: trendPrimaryClass(card.trend),
      };
    }
    return {
      primary: "Not enough data yet",
      trendClass: neutralMuted,
    };
  }

  if (card.kind === "consistency") {
    if (card.rawCvPercent != null) {
      return {
        primary: `±${card.rawCvPercent}%`,
        trendClass: trendPrimaryClass(card.trend),
      };
    }
    return {
      primary: "Not enough data yet",
      trendClass: neutralMuted,
    };
  }

  if (card.kind === "pr_frequency") {
    if (card.prEveryWorkouts != null) {
      return {
        primary: `1 PR every ${card.prEveryWorkouts} workouts`,
        trendClass: "text-zinc-200",
      };
    }
    if (card.mainText?.trim() === "No PRs yet") {
      return {
        primary: "No PRs yet",
        trendClass: neutralMuted,
      };
    }
    return {
      primary: "Not enough data yet",
      trendClass: neutralMuted,
    };
  }

  if (card.kind === "frequency") {
    if (card.rawSessionsPerWeek != null) {
      return {
        primary: `${card.rawSessionsPerWeek}× / week`,
        trendClass: trendPrimaryClass(card.trend),
      };
    }
    if (card.mainText?.includes("session")) {
      return {
        primary: card.mainText,
        trendClass: trendPrimaryClass(card.trend),
      };
    }
    return {
      primary: "Not enough data yet",
      trendClass: neutralMuted,
    };
  }

  if (card.kind === "best_period") {
    if (card.rawGainKg != null && card.mainText && !isMissingMain(card)) {
      return {
        primary: card.mainText,
        trendClass: trendPrimaryClass(card.trend),
      };
    }
    return {
      primary: "Not enough data yet",
      trendClass: neutralMuted,
    };
  }

  if (card.kind === "exercise_rank") {
    const primary = card.mainText?.trim() || "Not enough data yet";
    const withSub =
      primary !== "Not enough data to rank exercises yet." &&
      primary !== "Not enough data to rank this exercise yet." &&
      card.subText?.trim()
        ? `${primary} (${card.subText.trim()})`
        : primary;
    return {
      primary: withSub,
      trendClass:
        primary === "Not enough data to rank exercises yet." ||
        primary === "Not enough data to rank this exercise yet."
          ? neutralMuted
          : trendPrimaryClass(card.trend),
    };
  }

  return {
    primary: "Not enough data yet",
    trendClass: neutralMuted,
  };
}

function AnalyticsMetricCard({
  card,
  weightLabel,
  units,
  gridSpanClass,
  maskSensitiveValues,
}: {
  card: AdvancedStrengthMetricCard;
  weightLabel: string;
  units: "metric" | "imperial";
  gridSpanClass?: string;
  /** Pro preview: keep card titles readable; blur the headline metric only. */
  maskSensitiveValues?: boolean;
}) {
  const { primary, trendClass } = compactMetricPrimary(card, units, weightLabel);

  return (
    <article
      className={`flex min-h-[4rem] flex-col justify-center rounded-lg border border-zinc-800/90 bg-zinc-950/60 ${CARD_PAD} shadow-sm shadow-black/20 ${gridSpanClass ?? ""}`}
      aria-label={maskSensitiveValues ? `${card.title}, value hidden in preview` : undefined}
    >
      <h4 className={`${SECTION_LABEL} leading-none ${TITLE_TO_METRIC}`}>{card.title}</h4>
      <p
        className={`text-base font-bold leading-tight tabular-nums tracking-tight sm:text-[1.0625rem] ${trendClass} ${
          maskSensitiveValues ? "pointer-events-none select-none blur-lg saturate-[0.55] opacity-[0.78]" : ""
        }`}
        aria-hidden={maskSensitiveValues ? true : undefined}
      >
        {primary}
      </p>
    </article>
  );
}

function pickCardsInOrder(
  cards: AdvancedStrengthMetricCard[],
  kinds: readonly AdvancedStrengthMetricCard["kind"][]
): AdvancedStrengthMetricCard[] {
  return kinds.map((k) => cards.find((c) => c.kind === k)).filter(Boolean) as AdvancedStrengthMetricCard[];
}

function ExerciseAnalyticsBody({
  insufficient,
  cards,
  weightLabel,
  units,
  maskSensitiveValues,
}: {
  insufficient: boolean;
  cards: AdvancedStrengthMetricCard[];
  weightLabel: string;
  units: "metric" | "imperial";
  maskSensitiveValues?: boolean;
}) {
  if (insufficient) {
    return (
      <div className="px-3 pb-2.5 pt-1 sm:px-3">
        <div
          className={`min-h-[3.5rem] rounded-lg border border-zinc-800/90 bg-zinc-950/40 ${CARD_PAD} text-center text-xs leading-snug text-zinc-500 sm:text-sm`}
        >
          Log more workouts for this exercise to generate analytics.
        </div>
      </div>
    );
  }

  const mainCards = pickCardsInOrder(cards, MAIN_GRID_KINDS);
  const extraCards = pickCardsInOrder(cards, EXTRA_GRID_KINDS);

  return (
    <div className={`flex flex-col ${CARD_GAP} px-3 pb-2.5 pt-0 sm:px-3`}>
      <div className={`grid grid-cols-2 ${CARD_GAP}`}>
        {mainCards.map((c, i) => (
          <AnalyticsMetricCard
            key={`${c.kind}-${i}`}
            card={c}
            weightLabel={weightLabel}
            units={units}
            gridSpanClass={c.kind === "best_period" ? "col-span-2" : undefined}
            maskSensitiveValues={maskSensitiveValues}
          />
        ))}
      </div>
      {extraCards.length > 0 ? (
        <div className={`grid grid-cols-2 ${CARD_GAP}`}>
          {extraCards.map((c, i) => (
            <AnalyticsMetricCard
              key={`extra-${c.kind}-${i}`}
              card={c}
              weightLabel={weightLabel}
              units={units}
              maskSensitiveValues={maskSensitiveValues}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const combinedSelectClass =
  "w-full min-w-0 appearance-none rounded-md border border-zinc-700 bg-zinc-800/90 py-1.5 pl-2.5 pr-8 text-sm text-zinc-100 shadow-inner shadow-black/20 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-60";

export function AdvancedStrengthAnalyticsSection({
  maskSensitiveValues = false,
  initialData,
}: {
  /** Non‑Pro: show card layout and metric titles; blur headline numbers only. */
  maskSensitiveValues?: boolean;
  /** From Insights RSC — same server action as client refresh; avoids mount spinner. */
  initialData?: AdvancedStrengthAnalyticsPayload | null;
}) {
  const units = useUnits();
  const weightLabel = weightUnitLabel(units);
  const { requirePro } = useProAccess();
  const seededFromServer = initialData !== undefined;
  const [payload, setPayload] = useState<AdvancedStrengthAnalyticsPayload | null>(() =>
    seededFromServer ? (initialData as AdvancedStrengthAnalyticsPayload) : null
  );
  const [loading, setLoading] = useState(() => !seededFromServer);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(() =>
    seededFromServer ? (initialData as AdvancedStrengthAnalyticsPayload).selectedCategoryId : null
  );
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(() =>
    seededFromServer ? (initialData as AdvancedStrengthAnalyticsPayload).selectedExerciseId : null
  );
  const fetchTokenRef = useRef(0);

  const load = useCallback(async (req?: AdvancedStrengthAnalyticsRequest) => {
    const token = ++fetchTokenRef.current;
    setLoading(true);
    try {
      const res = await getAdvancedStrengthAnalytics(req ?? undefined);
      if (token !== fetchTokenRef.current) return;
      setPayload(res);
      setSelectedCategoryId(res.selectedCategoryId);
      setSelectedExerciseId(res.selectedExerciseId);
    } finally {
      if (token === fetchTokenRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (seededFromServer) return;
    void load(undefined);
  }, [load, seededFromServer]);

  const categories = payload?.categories ?? [];
  const row = payload?.row ?? null;
  const selectablePairCount = categories.reduce((n, c) => n + c.exercises.length, 0);
  const showFilters = selectablePairCount > 1;

  const combinedSelectValue =
    selectedCategoryId && selectedExerciseId
      ? `${selectedCategoryId}::${selectedExerciseId}`
      : "";

  const lockedCategoryName =
    selectedCategoryId != null ? categories.find((c) => c.id === selectedCategoryId)?.name ?? "" : "";
  const lockedExerciseName =
    selectedCategoryId != null && selectedExerciseId != null
      ? categories.find((c) => c.id === selectedCategoryId)?.exercises.find((e) => e.id === selectedExerciseId)
          ?.name ?? ""
      : "";

  const onCombinedSelect = (value: string) => {
    if (maskSensitiveValues) return;
    if (loading || !value) return;
    const sep = value.indexOf("::");
    if (sep < 0) return;
    const categoryId = value.slice(0, sep);
    const exerciseId = value.slice(sep + 2);
    if (categoryId === selectedCategoryId && exerciseId === selectedExerciseId) return;
    setSelectedCategoryId(categoryId);
    setSelectedExerciseId(exerciseId);
    void load({ categoryId, exerciseId });
  };

  return (
    <section id="advanced-strength-analytics" className="text-zinc-100">
      <h3 className={`${SECTION_LABEL} mb-2`}>Advanced Strength Analytics</h3>

      <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/25">
        {loading && !payload ? (
          <p className="px-3 py-4 text-center text-xs text-zinc-500 sm:text-sm">Loading analytics…</p>
        ) : categories.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs leading-snug text-zinc-500 sm:text-sm">
            Log strength workouts to see advanced analytics for your lifts.
          </p>
        ) : (
          <>
            {showFilters && selectedCategoryId && selectedExerciseId && (
              <div className="border-b border-zinc-800/70 bg-zinc-950/20 px-3 py-1.5 sm:px-3 sm:py-2">
                {maskSensitiveValues ? (
                  <div className="flex max-w-xl flex-col items-stretch gap-2">
                    <div
                      className="rounded-md border border-zinc-700 bg-zinc-800/90 px-2.5 py-1.5 text-sm leading-snug text-zinc-200 shadow-inner shadow-black/20"
                      title={`${lockedCategoryName} · ${lockedExerciseName}`}
                    >
                      <span className="text-zinc-500">Showing </span>
                      <span className="break-words">
                        {lockedCategoryName}
                        <span className="text-zinc-600"> · </span>
                        {lockedExerciseName}
                      </span>
                    </div>
                    <p className="px-0.5 text-center text-[11px] leading-snug text-zinc-500">
                      see every exercise with pro
                    </p>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => requirePro("advanced_analytics")}
                        className="tap-feedback rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400"
                      >
                        Unlock Liftly Pro
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative min-w-0 max-w-xl">
                    <select
                      id="advanced-strength-category-exercise"
                      value={combinedSelectValue}
                      onChange={(e) => onCombinedSelect(e.target.value)}
                      disabled={loading}
                      className={combinedSelectClass}
                      aria-label="Category and exercise"
                    >
                      {categories.flatMap((cat) =>
                        cat.exercises.map((ex) => (
                          <option key={`${cat.id}::${ex.id}`} value={`${cat.id}::${ex.id}`}>
                            {cat.name} • {ex.name}
                          </option>
                        ))
                      )}
                    </select>
                    <span
                      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] leading-none text-zinc-500"
                      aria-hidden
                    >
                      ▼
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className={showFilters ? "pt-2 pb-0.5" : "pt-1"}>
              {payload?.error ? (
                <p className="px-4 py-5 text-center text-xs leading-relaxed text-rose-400/90 sm:px-5 sm:text-sm">
                  {payload.error}
                </p>
              ) : loading && payload ? (
                <p className="px-4 py-5 text-center text-xs text-zinc-500 sm:px-5 sm:text-sm">
                  Updating analytics…
                </p>
              ) : row ? (
                <>
                  <ExerciseAnalyticsBody
                    insufficient={row.insufficient}
                    cards={row.cards}
                    weightLabel={weightLabel}
                    units={units}
                    maskSensitiveValues={maskSensitiveValues}
                  />
                  {maskSensitiveValues && row && !row.insufficient ? (
                    <div className="border-t border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 text-center sm:px-4">
                      <p className="text-[11px] leading-relaxed text-zinc-500">
                        Card titles stay visible; exact figures unlock with Liftly Pro.
                      </p>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
