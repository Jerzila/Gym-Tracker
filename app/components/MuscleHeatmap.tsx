"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MuscleHeatmapPoint } from "@/app/actions/insights";
import type { MuscleGroup } from "@/lib/muscleMapping";

/** Set to false to restore the muscle diagram. When true, show Coming Soon card instead. */
export const MUSCLE_HEATMAP_COMING_SOON = true;

/** Heatmap colors: None → dark gray, Low → yellow, Moderate → orange, High → red */
export const COLOR_NONE = "#3f3f46";
const COLOR_LOW = "#eab308";
const COLOR_MODERATE = "#f97316";
const COLOR_HIGH = "#ef4444";

/**
 * Returns fill color by sets (0 → gray, 1–4 → yellow, 5–8 → orange, 9+ → red).
 */
export function setsToHeatmapColor(sets: number): string {
  if (sets <= 0) return COLOR_NONE;
  if (sets <= 4) return COLOR_LOW;
  if (sets <= 8) return COLOR_MODERATE;
  return COLOR_HIGH;
}

/** SVG path id (e.g. chest, back) → display name for tooltip */
const MUSCLE_ID_TO_LABEL: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  abs: "Abs",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
};

/** MuscleGroup (from data) → SVG path id */
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

const SVG_SRC = "/muscle-diagram.svg";
/** Original SVG is 290×145; 4 figures in 2×2 grid. Male front = top-left, male back = top-right. */
const VIEWBOX_FRONT = "0 0 145 72.5";
const VIEWBOX_BACK = "145 0 145 72.5";

type Props = {
  data: MuscleHeatmapPoint[];
  gender?: "male" | "female" | null;
  compact?: boolean;
  emptyMessage?: string;
};

const SVG_NS = "http://www.w3.org/2000/svg";
const MUSCLE_PATH_IDS = ["chest", "back", "shoulders", "biceps", "triceps", "abs", "glutes"];

function applyHeatmapToContainer(
  container: HTMLDivElement | null,
  setsBySvgId: Record<string, number>
) {
  if (!container) return;
  for (const [id, sets] of Object.entries(setsBySvgId)) {
    const el = container.querySelector(`[id="${id}"]`) as SVGPathElement | null;
    if (el) el.setAttribute("fill", setsToHeatmapColor(sets));
  }
  for (const id of MUSCLE_PATH_IDS) {
    if (setsBySvgId[id] != null) continue;
    const el = container.querySelector(`[id="${id}"]`) as SVGPathElement | null;
    if (el) el.setAttribute("fill", COLOR_NONE);
  }
}

/** Faint body silhouette icon (placeholder for Coming Soon card) */
function BodySilhouetteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 96"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <ellipse cx="32" cy="12" rx="8" ry="10" />
      <path d="M32 22 v12 M24 34 l8 8 8-8" />
      <path d="M32 34 v24 M24 58 l8 8 8-8" />
      <path d="M20 34 h24 M18 58 h28" />
      <path d="M26 58 v20 M38 58 v20" />
    </svg>
  );
}

export function MuscleHeatmap({ data, compact = false, emptyMessage }: Props) {
  const [svgInner, setSvgInner] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ label: string; x: number; y: number } | null>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  // ----- Diagram logic: disabled when MUSCLE_HEATMAP_COMING_SOON. Restore by setting constant to false. -----
  useEffect(() => {
    if (MUSCLE_HEATMAP_COMING_SOON) return;
    fetch(SVG_SRC)
      .then((r) => r.text())
      .then((text) => {
        const match = text.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        setSvgInner(match ? match[1] : null);
      })
      .catch(() => setSvgInner(null));
  }, []);

  const setsBySvgId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of data) {
      const id = muscleGroupToSvgId(p.muscle);
      map[id] = (map[id] ?? 0) + p.sets;
    }
    return map;
  }, [data]);

  // Create two SVGs imperatively with correct viewBox so only male front/back show.
  useEffect(() => {
    if (MUSCLE_HEATMAP_COMING_SOON || !svgInner) return;
    const frontContainer = frontRef.current;
    if (!frontContainer) return;

    const frontSvg = document.createElementNS(SVG_NS, "svg");
    frontSvg.setAttribute("viewBox", VIEWBOX_FRONT);
    frontSvg.setAttribute("width", "260");
    frontSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    frontSvg.setAttribute("class", "muscle-diagram-svg block max-w-full h-auto");
    frontSvg.style.aspectRatio = "145/72.5";
    frontSvg.innerHTML = svgInner;
    frontContainer.innerHTML = "";
    frontContainer.appendChild(frontSvg);

    const backContainer = backRef.current;
    if (backContainer) {
      const backSvg = document.createElementNS(SVG_NS, "svg");
      backSvg.setAttribute("viewBox", VIEWBOX_BACK);
      backSvg.setAttribute("width", "260");
      backSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      backSvg.setAttribute("class", "muscle-diagram-svg block max-w-full h-auto");
      backSvg.style.aspectRatio = "145/72.5";
      backSvg.innerHTML = svgInner;
      backContainer.innerHTML = "";
      backContainer.appendChild(backSvg);
    }

    return () => {
      frontContainer.innerHTML = "";
      if (backContainer) backContainer.innerHTML = "";
    };
  }, [svgInner]);

  // Apply heatmap colors whenever data or SVG content changes.
  useEffect(() => {
    if (MUSCLE_HEATMAP_COMING_SOON) return;
    const id = requestAnimationFrame(() => {
      applyHeatmapToContainer(frontRef.current, setsBySvgId);
      applyHeatmapToContainer(backRef.current, setsBySvgId);
    });
    return () => cancelAnimationFrame(id);
  }, [svgInner, setsBySvgId]);

  const handleDiagramMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (MUSCLE_HEATMAP_COMING_SOON) return;
      const target = e.target as HTMLElement;
      const id = target.getAttribute?.("id");
      if (!id || id === "Path 0" || id === "Background") {
        setTooltip(null);
        return;
      }
      const label = MUSCLE_ID_TO_LABEL[id];
      if (label) setTooltip({ label, x: e.clientX, y: e.clientY });
      else setTooltip(null);
    },
    []
  );

  const handleDiagramMouseLeave = useCallback(() => setTooltip(null), []);

  const totalSets = data.reduce((sum, p) => sum + p.sets, 0);
  const hasData = totalSets > 0;

  // ----- Coming Soon: show card instead of diagram when MUSCLE_HEATMAP_COMING_SOON -----
  if (MUSCLE_HEATMAP_COMING_SOON) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 px-8 py-12 text-center">
        <BodySilhouetteIcon className="mx-auto mb-4 h-16 w-10 opacity-20 text-zinc-400" />
        <h4 className="mb-2 text-lg font-semibold text-zinc-200">Muscle Heatmap</h4>
        <p className="mb-4 max-w-sm text-sm text-zinc-400">
          A visual breakdown of which muscles you&apos;re training the most. This feature will
          highlight muscle stimulus across your body.
        </p>
        <span className="mb-4 inline-block rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-amber-400/90">
          Coming Soon
        </span>
        <p className="text-xs text-zinc-500">
          This feature will visualize your muscle training balance based on your workouts.
        </p>
      </div>
    );
  }

  // ----- Diagram UI (restored when MUSCLE_HEATMAP_COMING_SOON is false) -----
  return (
    <>
      <style>{`
        .muscle-diagram-svg path[id]:hover { filter: brightness(1.2); cursor: pointer; }
      `}</style>
      <div className="flex flex-col">
        <div className="flex flex-row flex-nowrap items-start justify-center gap-[60px]">
          <figure className="flex flex-col items-center">
            {!compact && (
              <figcaption className="mb-2 w-full text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                FRONT
              </figcaption>
            )}
            <div
              ref={frontRef}
              className="muscle-diagram-svg overflow-hidden rounded-lg"
              style={{ width: 260, maxWidth: "100%", minHeight: 130 }}
              onMouseMove={handleDiagramMouseMove}
              onMouseLeave={handleDiagramMouseLeave}
            />
          </figure>

          {!compact && (
            <figure className="flex flex-col items-center">
              <figcaption className="mb-2 w-full text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                BACK
              </figcaption>
              <div
                ref={backRef}
                className="muscle-diagram-svg overflow-hidden rounded-lg"
                style={{ width: 260, maxWidth: "100%", minHeight: 130 }}
                onMouseMove={handleDiagramMouseMove}
                onMouseLeave={handleDiagramMouseLeave}
              />
            </figure>
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

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-100 shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y + 8 }}
        >
          {tooltip.label}
        </div>
      )}
    </>
  );
}
