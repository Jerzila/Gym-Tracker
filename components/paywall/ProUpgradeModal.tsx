"use client";

import type { ReactElement, SVGProps } from "react";
import { BoltIcon, ChartIcon, TrophyIcon } from "@/components/icons";

const ICON_PX = 20;
const BULLET_ICON_PX = 18;
const iconClass = "shrink-0 text-[#f59e0b]";

type FeatureIcon = (props: SVGProps<SVGSVGElement> & { size?: number }) => ReactElement;

const proBenefitBullets: { label: string; Icon: FeatureIcon }[] = [
  { label: "Strength recommendations", Icon: BoltIcon as FeatureIcon },
  { label: "Full muscle rankings", Icon: TrophyIcon as FeatureIcon },
  { label: "Advanced progress analytics", Icon: ChartIcon as FeatureIcon },
];

export type ProUpgradeModalProps = {
  /** Shown under the subtitle; explains why upgrading helps for this feature. */
  benefitLine?: string;
  /** Title for the locked feature preview card. */
  featureTitle?: string;
  /** Description for the feature preview card. */
  featureDescription?: string;
  /** Same icon family as the main paywall for this feature. */
  FeatureIcon?: FeatureIcon;
};

/**
 * Secondary Pro upgrade UI for locked features. Not wired to navigation or purchases yet.
 * Pass `benefitLine`, `featureTitle`, `featureDescription`, and `FeatureIcon` when hooking to specific gates.
 */
export function ProUpgradeModal({
  benefitLine = "Get intelligent strength recommendations to progress faster.",
  featureTitle = "Strength Recommendations",
  featureDescription = "Get smart suggestions on when to increase weight or reps.",
  FeatureIcon = BoltIcon as FeatureIcon,
}: ProUpgradeModalProps) {
  return (
    <section
      className="min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#0f0f10] text-zinc-100"
      aria-labelledby="pro-upgrade-title"
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col justify-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="shrink-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,170,0,0.14),rgba(255,170,0,0.05)_45%,transparent_72%)] px-1 pb-0.5 text-center">
          <h1 id="pro-upgrade-title" className="text-xl font-bold leading-tight tracking-[-0.3px] text-zinc-50">
            Unlock Liftly Pro
          </h1>
          <p className="mt-1 text-[13px] leading-snug text-zinc-400">This feature is part of Liftly Pro.</p>
          <p className="mt-1.5 text-[13px] leading-snug text-zinc-300">{benefitLine}</p>
        </div>

        <div className="shrink-0 rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-3 shadow-[0_0_20px_rgba(255,170,0,0.05)]">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
              <FeatureIcon size={ICON_PX} className={iconClass} />
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold leading-snug text-zinc-100">{featureTitle}</p>
              <p className="mt-0.5 text-[13px] leading-[1.35] text-zinc-500">{featureDescription}</p>
            </div>
          </div>
        </div>

        <ul className="shrink-0 space-y-1.5" aria-label="Included with Liftly Pro">
          {proBenefitBullets.map(({ label, Icon }) => (
            <li key={label} className="flex items-center gap-2">
              <Icon size={BULLET_ICON_PX} className={iconClass} aria-hidden />
              <span className="text-[13px] leading-tight text-zinc-300">{label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-0.5 shrink-0 space-y-1.5">
          <button
            type="button"
            className="w-full rounded-[14px] bg-gradient-to-r from-[#f59e0b] to-[#ffb020] px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_6px_20px_rgba(245,158,11,0.45)] transition-opacity hover:opacity-95 tap-feedback"
          >
            Upgrade to Liftly Pro
          </button>
          <button
            type="button"
            className="w-full py-1.5 text-center text-sm font-semibold text-zinc-400 transition-colors hover:text-zinc-300 tap-feedback"
          >
            Maybe later
          </button>
        </div>
      </div>
    </section>
  );
}
