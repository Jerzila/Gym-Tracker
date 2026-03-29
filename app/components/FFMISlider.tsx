"use client";

import {
  FFMI_BAR_SEGMENTS,
  FFMI_SLIDER_MAX,
  FFMI_SLIDER_MIN,
  getFFMIPosition,
} from "@/lib/ffmi";

const SCALE_TICKS = [14, 18, 20, 22, 24, 25, 28] as const;

type Props = {
  ffmi: number;
};

/**
 * FFMI track: ticks and legend use the same linear scale as the indicator (14–28).
 */
export function FFMISlider({ ffmi }: Props) {
  const position = getFFMIPosition(ffmi);

  return (
    <>
      <div className="relative mb-1 h-4 w-full">
        {SCALE_TICKS.map((v) => {
          const left = getFFMIPosition(v);
          const isFirst = v === FFMI_SLIDER_MIN;
          const isLast = v === FFMI_SLIDER_MAX;
          return (
            <span
              key={v}
              className="absolute top-0 text-[10px] tabular-nums text-zinc-500 sm:text-xs"
              style={{
                left: `${left}%`,
                transform: isFirst ? "translateX(0)" : isLast ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {v === FFMI_SLIDER_MAX ? "28+" : v}
            </span>
          );
        })}
      </div>

      <div className="relative flex h-3 w-full overflow-hidden rounded-full">
        {FFMI_BAR_SEGMENTS.map((seg) => (
          <div
            key={seg.label}
            className="h-full flex-shrink-0"
            style={{ width: `${seg.widthPercent}%`, backgroundColor: seg.color }}
            title={seg.label}
          />
        ))}
        <div
          className="absolute -top-1 h-4 w-4 rounded-full border-2 border-zinc-900 bg-white shadow"
          style={{ left: `${position}%`, transform: "translateX(-50%)" }}
          title={`Your FFMI: ${ffmi}`}
        />
      </div>

      <div className="mt-1.5 flex w-full">
        {FFMI_BAR_SEGMENTS.map((seg) => (
          <div
            key={seg.label}
            className="min-w-0 flex-shrink-0 px-0.5 text-center text-[9px] leading-snug text-zinc-500 sm:px-1 sm:text-[10px]"
            style={{ width: `${seg.widthPercent}%` }}
            title={seg.label}
          >
            {seg.legendShort}
          </div>
        ))}
      </div>
    </>
  );
}
