"use client";

import {
  BMI_BAR_SEGMENTS,
  BMI_SLIDER_MAX,
  BMI_SLIDER_MIN,
  getBMIPosition,
} from "@/lib/bmi";

const SCALE_TICKS = [15, 18.5, 25, 30, 35] as const;

/** Segment midpoints — same linear 15–35 scale as the bar and indicator. */
const LEGEND_ITEMS = [
  { label: "Underweight", centerBmi: (15 + 18.5) / 2 },
  { label: "Normal weight", centerBmi: (18.5 + 25) / 2 },
  { label: "Overweight", centerBmi: (25 + 30) / 2 },
  { label: "Obese", centerBmi: (30 + 35) / 2 },
] as const;

type Props = {
  bmi: number;
  /** Tighter layout for dashboard card */
  compact?: boolean;
};

/**
 * BMI track: numeric ticks and category legend are placed by the same linear
 * scale as the indicator (actual BMI → percent of 15–35), not evenly spaced.
 */
export function BMISlider({ bmi, compact }: Props) {
  const position = getBMIPosition(bmi);

  return (
    <>
      <div className={compact ? "relative mb-0.5 h-4 w-full" : "relative mb-1 h-4 w-full"}>
        {SCALE_TICKS.map((v) => {
          const left = getBMIPosition(v);
          const isFirst = v === BMI_SLIDER_MIN;
          const isLast = v === BMI_SLIDER_MAX;
          return (
            <span
              key={v}
              className={
                compact
                  ? "absolute top-0 text-[10px] tabular-nums text-zinc-500"
                  : "absolute top-0 text-[10px] tabular-nums text-zinc-500 sm:text-xs"
              }
              style={{
                left: `${left}%`,
                transform: isFirst ? "translateX(0)" : isLast ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {v}
            </span>
          );
        })}
      </div>

      <div
        className={`relative flex w-full overflow-hidden rounded-full ${compact ? "h-2.5" : "h-3"}`}
      >
        {BMI_BAR_SEGMENTS.map((seg) => (
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
          title={`Your BMI: ${bmi}`}
        />
      </div>

      <div className={compact ? "relative mt-0.5 h-8 w-full" : "relative mt-1.5 h-10 w-full"}>
        {LEGEND_ITEMS.map(({ label, centerBmi }) => (
          <span
            key={label}
            className="absolute top-0 max-w-[30%] text-center text-[10px] leading-tight text-zinc-500"
            style={{
              left: `${getBMIPosition(centerBmi)}%`,
              transform: "translateX(-50%)",
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </>
  );
}
