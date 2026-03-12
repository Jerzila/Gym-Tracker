"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Body, { type ExtendedBodyPart } from "react-muscle-highlighter";
import type { MuscleHeatmapPoint } from "@/app/actions/insights";
import type { InsightsRange } from "@/app/actions/insights";
import type { MuscleGroup } from "@/lib/muscleMapping";

/** Scale so two diagrams fit side-by-side on iPhone (~390px). Larger on desktop. */
function useDiagramScale() {
  const [scale, setScale] = useState(1.5);
  useEffect(() => {
    const update = () => {
      const w = typeof window !== "undefined" ? window.innerWidth : 1024;
      setScale(w <= 430 ? 0.68 : w <= 640 ? 0.9 : 1.5);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return scale;
}

/** Liftly theme: grey inactive, yellow, orange, red (intensity 1–3). */
const LIFTLY_COLORS = ["#facc15", "#f97316", "#ef4444"] as const;
const DEFAULT_FILL = "#1f2937";

const WEEKLY_RANGES: InsightsRange[] = ["this_week", "last_week"];
const MONTHLY_RANGES: InsightsRange[] = ["this_month", "last_month"];

/** Period-based intensity: weekly vs monthly thresholds. */
function setsToIntensity(sets: number, range: InsightsRange): number {
  if (sets <= 0) return 0;
  const isMonthly = MONTHLY_RANGES.includes(range);
  if (isMonthly) {
    if (sets >= 16) return 3;
    if (sets >= 7) return 2;
    return 1;
  }
  if (sets >= 8) return 3;
  if (sets >= 4) return 2;
  return 1;
}

/** Map Liftly MuscleGroup to library slug(s). Back maps to both upper-back and lower-back. */
function muscleToSlugs(muscle: MuscleGroup): string[] {
  const map: Record<MuscleGroup, string[]> = {
    Chest: ["chest"],
    Back: ["upper-back", "lower-back"],
    Shoulders: ["deltoids"],
    Biceps: ["biceps"],
    Triceps: ["triceps"],
    Core: ["abs"],
    Glutes: ["gluteal"],
    Quads: ["quadriceps"],
    Hamstrings: ["hamstring"],
    Calves: ["calves"],
  };
  return map[muscle] ?? [];
}

/** Map library slug → Liftly MuscleGroup (for exercise lookup). */
function slugToMuscleGroup(slug: string): MuscleGroup | null {
  const map: Record<string, MuscleGroup> = {
    chest: "Chest",
    "upper-back": "Back",
    "lower-back": "Back",
    deltoids: "Shoulders",
    biceps: "Biceps",
    triceps: "Triceps",
    abs: "Core",
    gluteal: "Glutes",
    quadriceps: "Quads",
    hamstring: "Hamstrings",
    calves: "Calves",
  };
  return map[slug] ?? null;
}

/** Slug → display name for tooltip. */
const SLUG_LABEL: Record<string, string> = {
  chest: "Chest",
  "upper-back": "Upper Back",
  "lower-back": "Lower Back",
  deltoids: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  abs: "Abs",
  gluteal: "Glutes",
  quadriceps: "Quads",
  hamstring: "Hamstrings",
  calves: "Calves",
};

type Props = {
  data: MuscleHeatmapPoint[];
  range?: InsightsRange;
  gender?: "male" | "female" | null;
  emptyMessage?: string;
};

export function MuscleDiagram({ data, range = "this_week", gender = "male", emptyMessage }: Props) {
  const [selectedPart, setSelectedPart] = useState<ExtendedBodyPart | null>(null);
  const scale = useDiagramScale();
  const exercisesSectionRef = useRef<HTMLDivElement>(null);

  const { bodyData, setsBySlug, totalSets } = useMemo(() => {
    const setsBySlug: Record<string, number> = {};
    for (const p of data) {
      const slugs = muscleToSlugs(p.muscle);
      for (const slug of slugs) {
        setsBySlug[slug] = (setsBySlug[slug] ?? 0) + p.sets;
      }
    }
    const bodyData: ExtendedBodyPart[] = [];
    for (const [slug, sets] of Object.entries(setsBySlug)) {
      const intensity = setsToIntensity(sets, range);
      if (intensity === 0) continue;
      bodyData.push({ slug: slug as ExtendedBodyPart["slug"], intensity });
    }
    const totalSets = data.reduce((sum, p) => sum + p.sets, 0);
    return { bodyData, setsBySlug, totalSets };
  }, [data, range]);

  const handleBodyPartPress = useCallback(
    (part: ExtendedBodyPart) => {
      setSelectedPart(part);
      setTimeout(() => {
        exercisesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    },
    []
  );

  const selectedSlug = selectedPart?.slug;
  const selectedGroup = selectedSlug != null ? slugToMuscleGroup(selectedSlug) : null;
  const selectedExercises = useMemo(() => {
    if (!selectedGroup) return [];
    const point = data.find((p) => p.muscle === selectedGroup);
    return point?.exercises ?? [];
  }, [data, selectedGroup]);

  if (totalSets === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-10 text-center">
        <p className="text-sm text-zinc-500">
          {emptyMessage ?? "No muscle stimulus recorded yet. Log exercises to see your muscle heatmap."}
        </p>
      </div>
    );
  }

  const selectedSets = selectedSlug != null ? (setsBySlug[selectedSlug] ?? 0) : 0;
  const selectedLabel = selectedSlug != null ? SLUG_LABEL[selectedSlug] ?? selectedSlug : null;

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="relative flex w-full flex-row flex-wrap justify-center gap-4 md:gap-10 md:items-start">
        <div className="flex flex-col items-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Front</p>
          <Body
            data={bodyData}
            side="front"
            gender={gender === "female" ? "female" : "male"}
            scale={scale}
            colors={LIFTLY_COLORS}
            defaultFill={DEFAULT_FILL}
            border="none"
            onBodyPartPress={handleBodyPartPress}
          />
        </div>
        <div className="flex flex-col items-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Back</p>
          <Body
            data={bodyData}
            side="back"
            gender={gender === "female" ? "female" : "male"}
            scale={scale}
            colors={LIFTLY_COLORS}
            defaultFill={DEFAULT_FILL}
            border="none"
            onBodyPartPress={handleBodyPartPress}
          />
        </div>
        {selectedSlug && selectedLabel != null && (
          <div
            className="absolute right-0 top-0 z-10 rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-2.5 text-left shadow-lg backdrop-blur-sm md:right-2 md:top-2"
            style={{ minWidth: 140 }}
          >
            <p className="font-semibold text-zinc-100">{selectedLabel}</p>
            <p className="mt-0.5 text-sm text-zinc-400">
              {selectedSets} set{selectedSets !== 1 ? "s" : ""} this period
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-zinc-700" aria-hidden />
          <span>No stimulus</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-yellow-400" aria-hidden />
          <span>Light</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-orange-500" aria-hidden />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-red-500" aria-hidden />
          <span>High</span>
        </div>
      </div>

      {/* Exercises for selected muscle */}
      <div
        ref={exercisesSectionRef}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-4"
      >
        {!selectedLabel ? (
          <p className="text-center text-sm text-zinc-500">
            Tap a muscle to see which exercises trained it.
          </p>
        ) : (
          <>
            <h4 className="mb-1 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Exercises for {selectedLabel}
            </h4>
            {selectedSets > 0 && (
              <p className="mb-3 text-xs text-zinc-500">
                {selectedSets} set{selectedSets !== 1 ? "s" : ""} this period
              </p>
            )}
            {selectedExercises.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No exercises recorded for this muscle in this period.
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedExercises.map((name) => (
                  <li
                    key={name}
                    className="rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
