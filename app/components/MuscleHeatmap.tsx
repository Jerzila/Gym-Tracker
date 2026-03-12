"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MuscleHeatmapPoint } from "@/app/actions/insights";
import type { MuscleGroup } from "@/lib/muscleMapping";

/** Body outline / non-muscle shapes: always black. */
const COLOR_BODY = "#000000";
/** Muscles with no stimulus. */
const COLOR_NONE = "#2a2a2a";
/** Heatmap colors by weekly stimulus (sets). */
const COLOR_LOW = "#facc15";
const COLOR_MODERATE = "#f97316";
const COLOR_HIGH = "#ef4444";

export function setsToHeatmapColor(sets: number): string {
  if (sets <= 0) return COLOR_NONE;
  if (sets <= 4) return COLOR_LOW;
  if (sets <= 8) return COLOR_MODERATE;
  return COLOR_HIGH;
}

function getStimulusLabel(sets: number): string {
  if (sets <= 0) return "No stimulus";
  if (sets <= 4) return "Low stimulus";
  if (sets <= 8) return "Moderate stimulus";
  return "High stimulus";
}

/** SVG group id → display name */
const MUSCLE_ID_TO_LABEL: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  rear_delts: "Rear Delts",
  abs: "Abs",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
};

/** MuscleGroup (from API) → SVG group id */
function muscleGroupToSvgId(muscle: MuscleGroup): string {
  const map: Record<string, string> = {
    Chest: "chest",
    Back: "back",
    Shoulders: "shoulders",
    Biceps: "biceps",
    Triceps: "triceps",
    Core: "abs",
    Glutes: "glutes",
    Quads: "quads",
    Hamstrings: "hamstrings",
    Calves: "calves",
  };
  return map[muscle] ?? muscle.toLowerCase();
}

const SVG_SRC = "/muscle-diagram2.svg";

/** Use image + overlay heatmap (works without SVG muscle IDs). */
const USE_IMAGE_MUSCLE_MAP = true;

/** Overlay position for each muscle on the body image (400px width). Tweak to match your image. */
const MUSCLE_OVERLAYS: { id: string; label: string; top: number; left: number; width: number; height: number }[] = [
  { id: "chest", label: "Chest", top: 120, left: 130, width: 120, height: 80 },
  { id: "shoulders", label: "Shoulders", top: 80, left: 100, width: 180, height: 70 },
  { id: "biceps", label: "Biceps", top: 145, left: 85, width: 55, height: 65 },
  { id: "triceps", label: "Triceps", top: 145, left: 260, width: 55, height: 65 },
  { id: "abs", label: "Abs", top: 200, left: 140, width: 120, height: 75 },
  { id: "quads", label: "Quads", top: 280, left: 125, width: 150, height: 95 },
  { id: "hamstrings", label: "Hamstrings", top: 295, left: 130, width: 140, height: 60 },
  { id: "glutes", label: "Glutes", top: 250, left: 135, width: 130, height: 55 },
  { id: "calves", label: "Calves", top: 365, left: 130, width: 140, height: 55 },
  { id: "back", label: "Back", top: 115, left: 125, width: 130, height: 140 },
  { id: "rear_delts", label: "Rear Delts", top: 85, left: 105, width: 170, height: 55 },
];

/** Muscle group IDs in the SVG; only these get heatmap colors and hover. */
const MUSCLE_GROUP_IDS = [
  "chest",
  "shoulders",
  "biceps",
  "triceps",
  "back",
  "abs",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "rear_delts",
];

type Props = {
  data: MuscleHeatmapPoint[];
  gender?: "male" | "female" | null;
  compact?: boolean;
  emptyMessage?: string;
};

/** Set fill on a muscle group and all paths inside it (front + back). */
function setFillOnMuscleGroup(el: Element, color: string) {
  el.setAttribute("fill", color);
  (el as SVGElement).style.fill = color;
  const shapes = el.querySelectorAll("path, circle, ellipse, rect, polygon, polyline");
  shapes.forEach((s) => {
    s.setAttribute("fill", color);
    (s as SVGElement).style.fill = color;
  });
}

/** Force every shape and group in the SVG to black. Non-muscle elements must never change. */
function setEntireSvgToBlack(svg: SVGElement) {
  const selector = "path, circle, ellipse, rect, polygon, polyline, g";
  svg.querySelectorAll(selector).forEach((el) => {
    el.setAttribute("fill", COLOR_BODY);
    (el as SVGElement).style.fill = COLOR_BODY;
  });
}

/**
 * 1. Set entire SVG to black (body silhouette).
 * 2. Loop muscle IDs and apply stimulus color only to those groups (and their paths).
 */
function applyHeatmapColors(
  container: HTMLDivElement | null,
  setsBySvgId: Record<string, number>
) {
  if (!container) return;
  const svg = container.querySelector("svg");
  if (!svg) return;

  setEntireSvgToBlack(svg);

  for (const id of MUSCLE_GROUP_IDS) {
    const el = container.querySelector(`[id="${id}"]`);
    if (el) {
      const sets = setsBySvgId[id] ?? 0;
      const color = setsToHeatmapColor(sets);
      setFillOnMuscleGroup(el, color);
      (el as HTMLElement).style.filter = "";
    }
  }
}

export function MuscleHeatmap({ data, compact = false, emptyMessage }: Props) {
  const [svgLoaded, setSvgLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const svgFetchedRef = useRef(false);

  // Load SVG once and inject inline (so JS can control muscle groups)
  useEffect(() => {
    if (svgFetchedRef.current) return;
    svgFetchedRef.current = true;
    fetch(SVG_SRC)
      .then((res) => res.text())
      .then((svgText) => {
        const container = containerRef.current;
        if (!container) return;
        const match = svgText.match(/<svg[\s\S]*<\/svg>/i);
        const toInject = match ? match[0] : svgText;
        container.innerHTML = toInject;
        const svg = container.querySelector("svg");
        if (svg) {
          svg.setAttribute("class", "muscle-diagram-svg w-full h-auto");
          svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
          (svg as SVGElement).style.maxWidth = "420px";
          (svg as SVGElement).style.width = "100%";
        }
        setSvgLoaded(true);
      })
      .catch(() => setSvgLoaded(false));
  }, []);

  const setsBySvgId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of data) {
      const id = muscleGroupToSvgId(p.muscle);
      map[id] = (map[id] ?? 0) + p.sets;
    }
    return map;
  }, [data]);

  // When filter/data changes: only update muscle colors (do not reload SVG)
  useEffect(() => {
    if (!svgLoaded) return;
    applyHeatmapColors(containerRef.current, setsBySvgId);
  }, [svgLoaded, setsBySvgId]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      let target = e.target as HTMLElement | null;
      let foundId: string | null = null;
      while (target && target !== containerRef.current) {
        const id = target.getAttribute?.("id");
        if (id && MUSCLE_GROUP_IDS.includes(id)) {
          foundId = id;
          break;
        }
        target = target.parentElement;
      }
      setHoveredId(foundId);
    },
    []
  );

  const handlePointerLeave = useCallback(() => setHoveredId(null), []);

  // Hover: brighten only the hovered muscle (mouseenter/mouseleave style)
  useEffect(() => {
    if (!containerRef.current) return;
    for (const id of MUSCLE_GROUP_IDS) {
      const el = containerRef.current.querySelector(`[id="${id}"]`) as SVGGraphicsElement | null;
      if (el) {
        const styleEl = el as unknown as { style: { filter: string } };
        if (id === hoveredId) styleEl.style.filter = "brightness(1.2)";
        else styleEl.style.filter = "none";
      }
    }
  }, [hoveredId]);

  const totalSets = data.reduce((sum, p) => sum + p.sets, 0);
  const hasData = totalSets > 0;

  const hoveredSets = hoveredId != null ? (setsBySvgId[hoveredId] ?? 0) : 0;
  const hoveredLabel = hoveredId != null ? MUSCLE_ID_TO_LABEL[hoveredId] ?? hoveredId : null;

  if (USE_IMAGE_MUSCLE_MAP) {
    return (
      <div className="flex flex-col">
        <style>{`
          .muscle-map-container {
            position: relative;
            width: 400px;
            max-width: 100%;
            margin: 0 auto;
          }
          .muscle-map-container .muscle-image {
            width: 100%;
            display: block;
            vertical-align: top;
          }
          .muscle-map-container .muscle-overlay {
            position: absolute;
            border-radius: 50%;
            opacity: 0.65;
            cursor: pointer;
            transition: filter 0.15s ease, opacity 0.15s ease;
          }
          .muscle-map-container .muscle-overlay:hover {
            filter: brightness(1.2);
            opacity: 0.85;
          }
        `}</style>
        <div className="relative inline-block w-full max-w-[420px] self-center">
          <div className="muscle-map-container overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
            <img src="/muscle-test.png" alt="Muscle diagram" className="muscle-image" />
            {MUSCLE_OVERLAYS.map((m) => {
              const sets = setsBySvgId[m.id] ?? 0;
              const color = setsToHeatmapColor(sets);
              const isHovered = hoveredId === m.id;
              return (
                <div
                  key={m.id}
                  className="muscle-overlay"
                  role="button"
                  tabIndex={0}
                  aria-label={`${m.label}, ${sets} sets, ${getStimulusLabel(sets)}`}
                  style={{
                    top: m.top,
                    left: m.left,
                    width: m.width,
                    height: m.height,
                    background: color,
                    filter: isHovered ? "brightness(1.2)" : "none",
                    opacity: isHovered ? 0.85 : 0.65,
                  }}
                  onPointerEnter={() => setHoveredId(m.id)}
                  onPointerLeave={() => setHoveredId(null)}
                />
              );
            })}
          </div>
          {hoveredId && (() => {
            const m = MUSCLE_OVERLAYS.find((o) => o.id === hoveredId);
            const sets = setsBySvgId[hoveredId] ?? 0;
            if (!m) return null;
            return (
              <div
                className="absolute right-2 top-2 z-10 rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-2.5 text-left shadow-lg backdrop-blur-sm"
                style={{ minWidth: 140 }}
              >
                <p className="font-semibold text-zinc-100">{m.label}</p>
                <p className="mt-0.5 text-sm text-zinc-400">
                  {sets} set{sets !== 1 ? "s" : ""} this period
                </p>
                <p className="mt-1 text-xs font-medium text-amber-400/90">
                  {getStimulusLabel(sets)}
                </p>
              </div>
            );
          })()}
        </div>
        {!totalSets && emptyMessage && (
          <p className="mt-4 text-center text-sm text-zinc-500">{emptyMessage}</p>
        )}
        {!compact && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="inline-block h-3 w-3 shrink-0 rounded-sm border border-zinc-600" style={{ backgroundColor: COLOR_NONE }} aria-hidden />
              None
            </span>
            <span className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="inline-block h-3 w-3 shrink-0 rounded-sm border border-zinc-600" style={{ backgroundColor: COLOR_LOW }} aria-hidden />
              Low
            </span>
            <span className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="inline-block h-3 w-3 shrink-0 rounded-sm border border-zinc-600" style={{ backgroundColor: COLOR_MODERATE }} aria-hidden />
              Moderate
            </span>
            <span className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="inline-block h-3 w-3 shrink-0 rounded-sm border border-zinc-600" style={{ backgroundColor: COLOR_HIGH }} aria-hidden />
              High
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <style>{`
        .muscle-diagram-svg [id] { cursor: pointer; transition: filter 0.15s ease; }
      `}</style>
      <div className="flex flex-col">
        <div className="relative inline-block w-full max-w-[420px] self-center">
          <div
            id="muscle-diagram"
            ref={containerRef}
            className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40"
            style={{ minHeight: 280 }}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
          />
          {/* Hover widget: top-right of diagram, not over the body */}
          {hoveredId && hoveredLabel != null && (
            <div
              className="absolute right-2 top-2 z-10 rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-2.5 text-left shadow-lg backdrop-blur-sm"
              style={{ minWidth: 140 }}
            >
              <p className="font-semibold text-zinc-100">{hoveredLabel}</p>
              <p className="mt-0.5 text-sm text-zinc-400">
                {hoveredSets} set{hoveredSets !== 1 ? "s" : ""} this period
              </p>
              <p className="mt-1 text-xs font-medium text-amber-400/90">
                {getStimulusLabel(hoveredSets)}
              </p>
            </div>
          )}
        </div>

        {!hasData && emptyMessage && (
          <p className="mt-4 text-center text-sm text-zinc-500">{emptyMessage}</p>
        )}

        {!compact && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-zinc-300">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm border border-zinc-600"
                style={{ backgroundColor: COLOR_NONE }}
                aria-hidden
              />
              None
            </span>
            <span className="flex items-center gap-2 text-sm text-zinc-300">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm border border-zinc-600"
                style={{ backgroundColor: COLOR_LOW }}
                aria-hidden
              />
              Low
            </span>
            <span className="flex items-center gap-2 text-sm text-zinc-300">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm border border-zinc-600"
                style={{ backgroundColor: COLOR_MODERATE }}
                aria-hidden
              />
              Moderate
            </span>
            <span className="flex items-center gap-2 text-sm text-zinc-300">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm border border-zinc-600"
                style={{ backgroundColor: COLOR_HIGH }}
                aria-hidden
              />
              High
            </span>
          </div>
        )}
      </div>
    </>
  );
}
