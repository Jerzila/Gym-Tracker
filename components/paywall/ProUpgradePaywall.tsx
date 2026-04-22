"use client";

import type { ReactElement, SVGProps } from "react";
import { useMemo, useState } from "react";
import { BoltIcon, CalendarIcon, ChartIcon, StarIcon, TrophyIcon } from "@/components/icons";
import { AffiliateCodeSection } from "@/components/paywall/AffiliateCodeSection";
import { PaywallLegalFooter } from "@/components/paywall/PaywallLegalFooter";
import type { RevenueCatPlanPricing } from "@/app/lib/purchases/revenueCat";
import { haptic } from "@/lib/haptic";

export type ProPlan = "noAds" | "monthly" | "yearly";

const DEFAULT_PLAN: ProPlan = "monthly";

const ICON_PX = 18;
const iconClass = "shrink-0 text-[#f59e0b]";

function parsePriceValue(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const normalized = match[1].replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractCurrencySymbol(raw: string): string {
  const symbol = raw.replace(/[\d\s.,]/g, "").trim();
  return symbol || "€";
}

function formatCurrencyAmount(amount: number, samplePrice: string): string {
  return `${extractCurrencySymbol(samplePrice)}${amount.toFixed(2)}`;
}

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

const NO_ADS_TITLE = "No Ads";

const featureItems: { title: string; description: string; Icon: FeatureIcon }[] = [
  {
    title: "Strength Recommendations",
    description: "Smart weight & rep suggestions.",
    Icon: BoltIcon as FeatureIcon,
  },
  {
    title: "Full Muscle Rankings",
    description: "Rankings for every muscle group.",
    Icon: TrophyIcon as FeatureIcon,
  },
  {
    title: "Advanced Progress Analytics",
    description: "1RM trends & long-term progress.",
    Icon: ChartIcon as FeatureIcon,
  },
  {
    title: "Full Workout History",
    description: "Your complete training log.",
    Icon: CalendarIcon as FeatureIcon,
  },
  {
    title: NO_ADS_TITLE,
    description: "Train without interruptions.",
    Icon: ShieldIcon as FeatureIcon,
  },
];

const timelineSteps: { label: string; body: string; Icon: FeatureIcon }[] = [
  { label: "TODAY", body: "Start your free trial", Icon: BoltIcon as FeatureIcon },
  { label: "DAY 5", body: "Get a reminder before your trial ends", Icon: BellIcon as FeatureIcon },
  { label: "DAY 7", body: "Choose to continue with Liftly Pro", Icon: StarIcon as FeatureIcon },
];

function Timeline() {
  return (
    <ol className="m-0 w-full list-none space-y-1" aria-label="Free trial timeline">
      {timelineSteps.map((step) => {
        const StepIcon = step.Icon;
        return (
          <li key={step.label} className="flex w-full items-start gap-1.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
              <StepIcon size={18} className={iconClass} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[11px] font-semibold leading-tight tracking-wide text-[#f59e0b] min-[390px]:text-[12px]">
                {step.label}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-zinc-500 min-[390px]:text-[11px]">{step.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Secondary Pro upgrade UI (trial + pricing).
 */
export function ProUpgradePaywall({
  initialPlan = DEFAULT_PLAN,
  loading = false,
  purchaseNotice = null,
  savedAffiliateCode = null,
  onAffiliateClaimed,
  onClose,
  onPurchase,
  pricing,
}: {
  initialPlan?: ProPlan;
  loading?: boolean;
  purchaseNotice?: string | null;
  /** Current saved partner code for prefilling / invalid-apply UX. */
  savedAffiliateCode?: string | null;
  onAffiliateClaimed?: () => void;
  onClose?: () => void;
  onPurchase?: (plan: ProPlan) => void;
  pricing?: RevenueCatPlanPricing;
}) {
  const [plan, setPlan] = useState<ProPlan>(initialPlan);

  const visibleFeatures = useMemo(
    () => (plan === "noAds" ? featureItems.filter((f) => f.title === NO_ADS_TITLE) : featureItems),
    [plan]
  );

  const closeButtonEnabled = typeof onClose === "function";

  const noAdsPrice = pricing?.noAdsMonthly ?? "€4.99";
  const monthlyPrice = pricing?.monthly ?? "€5.99";
  const yearlyPrice = pricing?.yearly ?? "€49.99";
  const monthlyValue = parsePriceValue(monthlyPrice);
  const yearlyValue = parsePriceValue(yearlyPrice);
  const yearlyPerMonthValue = yearlyValue ? yearlyValue / 12 : null;
  const yearlySavePercent =
    monthlyValue && yearlyPerMonthValue && monthlyValue > 0
      ? Math.max(0, Math.round(((monthlyValue - yearlyPerMonthValue) / monthlyValue) * 100))
      : null;
  const yearlyPerMonthLabel = yearlyPerMonthValue
    ? formatCurrencyAmount(yearlyPerMonthValue, yearlyPrice)
    : extractCurrencySymbol(yearlyPrice);
  const trialFooter =
    plan === "noAds"
      ? `${noAdsPrice}/month • Removes ads only`
      : plan === "monthly"
        ? `Then ${monthlyPrice}/month • Cancel anytime during your trial`
        : `Then ${yearlyPrice}/year • Cancel anytime during your trial`;

  const ctaLabel = useMemo(() => {
    if (loading) return "Processing...";
    return plan === "noAds" ? "Remove Ads" : "Start your free trial";
  }, [loading, plan]);

  return (
    <section className="relative flex h-screen max-h-screen min-h-0 flex-col overflow-hidden bg-[#0f0f10] text-zinc-100">
      <button
        type="button"
        onClick={onClose}
        disabled={!closeButtonEnabled}
        className="absolute left-2 top-[max(0.35rem,env(safe-area-inset-top))] z-10 flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 tap-feedback"
        aria-label="Close"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>

      <div className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col justify-between px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(2.1rem,calc(env(safe-area-inset-top)+1.5rem))]">
        {/* SECTION 1 — header (trial + timeline) */}
        <div className="shrink-0 space-y-1.5 min-[390px]:space-y-2">
          <header className="text-center">
            <div className="trial-highlight">
              {plan !== "noAds" ? (
                <>
                  <h1 className="text-[22px] font-bold leading-[1.1] tracking-[-0.45px] text-zinc-50 min-[390px]:text-[26px]">
                    Your first week&apos;s on us
                  </h1>
                  <p className="mx-auto mt-0.5 max-w-[20rem] text-[11px] leading-snug text-zinc-400 min-[390px]:mt-1 min-[390px]:text-[14px]">
                    7 days free, then Liftly Pro unlocks your full training potential.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-[22px] font-bold leading-[1.1] tracking-[-0.45px] text-zinc-50 min-[390px]:text-[26px]">
                    Train without ads
                  </h1>
                  <p className="mx-auto mt-0.5 max-w-[20rem] text-[11px] leading-snug text-zinc-400 min-[390px]:mt-1 min-[390px]:text-[14px]">
                    Same app experience with banners &amp; promos removed.
                  </p>
                </>
              )}
            </div>
          </header>
          {plan !== "noAds" ? (
            <div className="w-full px-0.5">
              <Timeline />
            </div>
          ) : (
            <p className="px-0.5 text-center text-[10px] leading-snug text-zinc-500 min-[390px]:text-[11px]">
              Removes in-app ads. No free trial — billed monthly.
            </p>
          )}
        </div>

        {/* SECTION 2 — features (Pro: vertically centered; No ads: align to top so single card sits under header) */}
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
            plan === "noAds" ? "justify-start pt-1" : "justify-center"
          }`}
        >
          <ul
            className="flex max-h-full min-h-0 w-full flex-col gap-2 overflow-y-auto overflow-x-hidden min-[390px]:gap-2.5"
            aria-label={plan === "noAds" ? "No ads" : "Liftly Pro features"}
          >
            {visibleFeatures.map((item) => {
              const Icon = item.Icon;
              return (
                <li key={item.title} className="min-h-0 shrink-0">
                  <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 min-[390px]:gap-3 min-[390px]:px-3.5 min-[390px]:py-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center min-[390px]:h-8 min-[390px]:w-8" aria-hidden>
                      <Icon size={22} className={iconClass} />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[13px] font-semibold leading-snug text-zinc-100 min-[390px]:text-[15px]">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[12px] leading-snug text-zinc-500 min-[390px]:text-[13px]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* SECTION 3 — optional affiliate (attribution only; does not change purchases) */}
        <div className="shrink-0 px-0.5">
          <AffiliateCodeSection
            savedAffiliateCode={savedAffiliateCode}
            onClaimed={onAffiliateClaimed}
            compact
          />
        </div>

        {/* SECTION 4 — pricing + CTA (fixed band at bottom) */}
        <div className="shrink-0 space-y-1.5 min-[390px]:space-y-2">
            <div role="radiogroup" aria-label="Subscription plan">
              <div className="grid min-w-0 grid-cols-3 gap-1 min-[390px]:gap-1.5">
                <button
                  type="button"
                  role="radio"
                  aria-checked={plan === "noAds"}
                  onClick={() => setPlan("noAds")}
                  className={`min-w-0 rounded-[12px] p-1.5 text-left transition-all tap-feedback min-[390px]:p-2 ${
                    plan === "noAds"
                      ? "border-2 border-[#f59e0b] bg-white/[0.06] shadow-[0_0_14px_rgba(245,158,11,0.32)] ring-1 ring-[#f59e0b]/40"
                      : "border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14]"
                  }`}
                >
                  <p className="text-[7px] font-semibold uppercase tracking-wide text-zinc-500 min-[390px]:text-[8px]">
                    No ads
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold leading-tight text-zinc-50 min-[390px]:text-[11px]">
                    {noAdsPrice} <span className="text-[8px] font-medium text-zinc-400">/ month</span>
                  </p>
                  <p className="mt-1 text-[7px] leading-tight text-zinc-500 min-[390px]:text-[8px]">Removes ads</p>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={plan === "monthly"}
                  onClick={() => setPlan("monthly")}
                  className={`relative min-w-0 rounded-[12px] p-1.5 text-left transition-all tap-feedback min-[390px]:p-2 ${
                    plan === "monthly"
                      ? "border-2 border-[#f59e0b] bg-gradient-to-b from-amber-500/15 to-white/[0.04] shadow-[0_0_16px_rgba(245,158,11,0.35)] ring-1 ring-[#f59e0b]/45"
                      : "border border-amber-500/25 bg-amber-500/[0.06] hover:border-amber-500/40"
                  }`}
                >
                  <span className="mb-0.5 inline-block rounded-full bg-amber-500/25 px-1.5 py-px text-[6.5px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/40 min-[390px]:text-[7px]">
                    Most popular
                  </span>
                  <p className="text-[8px] font-semibold uppercase tracking-wide text-zinc-400 min-[390px]:text-[9px]">
                    Pro
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold leading-tight text-zinc-50 min-[390px]:text-[11px]">
                    {monthlyPrice} <span className="text-[8px] font-medium text-zinc-400">/ month</span>
                  </p>
                  <p className="mt-0.5 text-[7px] leading-tight text-zinc-500 min-[390px]:text-[8px]">Full Pro</p>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={plan === "yearly"}
                  onClick={() => setPlan("yearly")}
                  className={`relative min-w-0 rounded-[12px] p-1.5 text-left transition-all tap-feedback min-[390px]:p-2 ${
                    plan === "yearly"
                      ? "border-2 border-emerald-500/70 bg-gradient-to-b from-emerald-500/12 to-white/[0.04] shadow-[0_0_16px_rgba(16,185,129,0.22)] ring-1 ring-emerald-500/35"
                      : "border border-emerald-500/25 bg-emerald-500/[0.06] hover:border-emerald-500/40"
                  }`}
                >
                  <span className="mb-0.5 inline-block rounded-full bg-emerald-500/20 px-1.5 py-px text-[6.5px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/35 min-[390px]:text-[7px]">
                    Best value
                  </span>
                  <p className="text-[8px] font-semibold uppercase tracking-wide text-zinc-400 min-[390px]:text-[9px]">
                    Yearly
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold leading-tight text-zinc-50 min-[390px]:text-[11px]">
                    {yearlyPrice} <span className="text-[8px] font-medium text-zinc-400">/ year</span>
                  </p>
                  <p className="mt-0.5 text-[7px] font-semibold text-emerald-400/95 min-[390px]:text-[8px]">
                    Save {yearlySavePercent ?? 0}%
                  </p>
                  <p className="text-[7px] text-zinc-400 min-[390px]:text-[8px]">
                    {yearlyPerMonthLabel} <span className="text-zinc-500">/ mo</span>
                  </p>
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                haptic();
                onPurchase?.(plan);
              }}
              className="w-full rounded-[14px] bg-gradient-to-r from-[#f59e0b] to-[#ffb020] px-4 py-2.5 text-[15px] font-semibold leading-tight text-zinc-950 shadow-[0_6px_20px_rgba(245,158,11,0.45)] transition-opacity hover:opacity-95 tap-feedback min-[390px]:py-3 min-[390px]:text-base"
            >
              {ctaLabel}
            </button>
            {purchaseNotice ? (
              <p className="text-center text-[11px] leading-snug text-amber-300">{purchaseNotice}</p>
            ) : null}
            <p className="text-center text-[10px] leading-tight text-zinc-500 min-[390px]:text-[11px]">{trialFooter}</p>
            <div className="mt-2 px-0.5">
              <PaywallLegalFooter compact />
            </div>
          </div>
      </div>
    </section>
  );
}
