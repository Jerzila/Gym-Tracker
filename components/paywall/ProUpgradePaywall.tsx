"use client";

import type { ReactElement, SVGProps } from "react";
import { useState } from "react";
import { BoltIcon, CalendarIcon, ChartIcon, StarIcon, TrophyIcon } from "@/components/icons";

type Plan = "monthly" | "yearly";

const DEFAULT_PLAN: Plan = "yearly";

const ICON_PX = 18;
const iconClass = "shrink-0 text-[#f59e0b]";

type FeatureIcon = (props: SVGProps<SVGSVGElement> & { size?: number }) => ReactElement;

function ShieldIcon({ size = ICON_PX, className, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 3 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-3Z" />
    </svg>
  );
}

/** Bell — matches stroke style of icons in `@/components/icons`. */
function BellIcon({ size = ICON_PX, className, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

const featureItems: { title: string; description: string; Icon: FeatureIcon }[] = [
  {
    title: "Strength Recommendations",
    description: "Get smart suggestions on when to increase weight or reps.",
    Icon: BoltIcon as FeatureIcon,
  },
  {
    title: "Full Muscle Rankings",
    description: "See your exact strength ranking for every muscle group.",
    Icon: TrophyIcon as FeatureIcon,
  },
  {
    title: "Advanced Progress Analytics",
    description: "Track estimated 1RM and long-term strength progression.",
    Icon: ChartIcon as FeatureIcon,
  },
  {
    title: "Full Workout History",
    description: "Access every workout you've ever logged.",
    Icon: CalendarIcon as FeatureIcon,
  },
  {
    title: "No Ads",
    description: "Train without interruptions.",
    Icon: ShieldIcon as FeatureIcon,
  },
];

const TIMELINE_ICON_PX = 22;

const timelineSteps: { label: string; body: string; Icon: FeatureIcon }[] = [
  { label: "TODAY", body: "Start your free trial", Icon: BoltIcon as FeatureIcon },
  { label: "DAY 5", body: "Get a reminder before your trial ends", Icon: BellIcon as FeatureIcon },
  { label: "DAY 7", body: "Choose to continue with Liftly Pro", Icon: StarIcon as FeatureIcon },
];

function Timeline() {
  return (
    <ol className="m-0 w-full list-none space-y-1.5" aria-label="Free trial timeline">
      {timelineSteps.map((step) => {
        const StepIcon = step.Icon;
        return (
          <li key={step.label} className="flex w-full items-start gap-2">
            <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center" aria-hidden>
              <StepIcon size={TIMELINE_ICON_PX} className={iconClass} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[12px] font-semibold leading-tight tracking-wide text-[#f59e0b] min-[390px]:text-[13px]">
                {step.label}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 min-[390px]:text-[12px]">{step.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Secondary Pro upgrade UI (trial + pricing). UI only — not wired to purchases or gating.
 */
export function ProUpgradePaywall() {
  const [plan, setPlan] = useState<Plan>(DEFAULT_PLAN);

  return (
    <section className="relative max-h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#0f0f10] text-zinc-100">
      <button
        type="button"
        className="absolute left-2 top-[max(0.35rem,env(safe-area-inset-top))] z-10 flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 tap-feedback"
        aria-label="Close"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>

      <div className="mx-auto flex h-full min-h-0 max-h-[100dvh] w-full max-w-md flex-col gap-1.5 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(2.1rem,calc(env(safe-area-inset-top)+1.5rem))] min-[390px]:gap-2">
        {/* Trial headline — gold border + glow (globals.css .trial-highlight) */}
        <header className="shrink-0 text-center">
          <div className="trial-highlight">
            <h1 className="text-[22px] font-bold leading-[1.1] tracking-[-0.45px] text-zinc-50 min-[390px]:text-[26px]">
              Your first week&apos;s on us
            </h1>
            <p className="mx-auto mt-0.5 max-w-[20rem] text-[11px] leading-snug text-zinc-400 min-[390px]:mt-1 min-[390px]:text-[14px]">
              7 days free, then Liftly Pro unlocks your full training potential.
            </p>
          </div>
        </header>

        {/* Timeline — sits closer to trial block so feature list gets more room */}
        <div className="w-full shrink-0 px-0.5 pt-0 min-[390px]:pt-0.5">
          <Timeline />
        </div>

        {/* Features: equal flex rows so all five fit without scrolling */}
        <div className="flex min-h-0 flex-1 flex-col">
          <ul
            className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden min-[390px]:gap-1.5"
            aria-label="Liftly Pro features"
          >
            {featureItems.map((item) => {
              const Icon = item.Icon;
              return (
                <li key={item.title} className="flex min-h-0 flex-1 flex-col">
                  <div className="flex h-full min-h-0 flex-1 items-start gap-1.5 rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 shadow-[0_0_16px_rgba(255,170,0,0.04)] min-[390px]:gap-2 min-[390px]:px-2.5 min-[390px]:py-2">
                    <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center" aria-hidden>
                      <Icon size={ICON_PX} className={iconClass} />
                    </span>
                    <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                      <p className="text-[11px] font-semibold leading-tight text-zinc-100 min-[390px]:text-xs">
                        {item.title}
                      </p>
                      <p className="mt-0.5 line-clamp-3 text-[10px] leading-[1.28] text-zinc-500 min-[390px]:text-[11px]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Pricing + CTA — anchored to bottom */}
          <div className="mt-auto shrink-0 space-y-1.5 pt-3 min-[390px]:space-y-2 min-[390px]:pt-4">
            <div role="radiogroup" aria-label="Subscription plan">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  role="radio"
                  aria-checked={plan === "monthly"}
                  onClick={() => setPlan("monthly")}
                  className={`rounded-[12px] p-1.5 text-left transition-all tap-feedback min-[390px]:p-2 ${
                    plan === "monthly"
                      ? "border-2 border-[#f59e0b] bg-white/[0.05] shadow-[0_0_12px_rgba(245,158,11,0.28)] ring-1 ring-[#f59e0b]/35"
                      : "border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14]"
                  }`}
                >
                  <p className="text-[8px] font-semibold uppercase tracking-wide text-zinc-500 min-[390px]:text-[9px]">
                    Monthly
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold leading-tight text-zinc-50 min-[390px]:text-xs">
                    €5.99 <span className="text-[9px] font-medium text-zinc-400">/ month</span>
                  </p>
                  <p className="mt-1 text-[8px] leading-tight text-zinc-500 min-[390px]:text-[9px]">Cancel anytime</p>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={plan === "yearly"}
                  onClick={() => setPlan("yearly")}
                  className={`rounded-[12px] p-1.5 text-left transition-all tap-feedback min-[390px]:p-2 ${
                    plan === "yearly"
                      ? "border-2 border-[#f59e0b] bg-white/[0.03] shadow-[0_0_12px_rgba(245,158,11,0.28)] ring-1 ring-[#f59e0b]/35"
                      : "border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14]"
                  }`}
                >
                  <p className="text-[8px] font-semibold uppercase tracking-wide text-zinc-500 min-[390px]:text-[9px]">
                    Yearly Pro
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold leading-tight text-zinc-50 min-[390px]:text-xs">
                    €49.99 <span className="text-[9px] font-medium text-zinc-400">/ year</span>
                  </p>
                  <p className="mt-1 text-[9px] font-semibold text-[#f59e0b] min-[390px]:text-[10px]">Save 30%</p>
                  <p className="mt-0.5 text-[8px] text-zinc-400 min-[390px]:text-[9px]">
                    €4.16 <span className="text-zinc-500">/ month</span>
                  </p>
                </button>
              </div>
            </div>

            <button
              type="button"
              className="w-full rounded-[14px] bg-gradient-to-r from-[#f59e0b] to-[#ffb020] px-4 py-2.5 text-[15px] font-semibold leading-tight text-zinc-950 shadow-[0_6px_20px_rgba(245,158,11,0.45)] transition-opacity hover:opacity-95 tap-feedback min-[390px]:py-3 min-[390px]:text-base"
            >
              Start your free trial
            </button>
            <p className="text-center text-[10px] leading-tight text-zinc-500 min-[390px]:text-[11px]">
              Cancel anytime during your trial.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
