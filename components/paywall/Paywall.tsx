"use client";

import type { ReactElement, SVGProps } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BoltIcon, CalendarIcon, ChartIcon, TrophyIcon } from "@/components/icons";
import { AffiliateCodeSection } from "@/components/paywall/AffiliateCodeSection";
import { PaywallLegalFooter } from "@/components/paywall/PaywallLegalFooter";
import { haptic } from "@/lib/haptic";
import { APP_HOME } from "@/lib/appRoutes";

type Plan = "noAds" | "monthly" | "yearly";

const DEFAULT_PLAN: Plan = "monthly";

const ICON_PX = 20;
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

const featureListItems: { title: string; description: string; Icon: FeatureIcon }[] = [
  {
    title: "Strength recommendations",
    description: "Get smart suggestions on when to increase weight or reps.",
    Icon: BoltIcon as FeatureIcon,
  },
  {
    title: "Full muscle rankings",
    description: "See your exact strength rank for every muscle group.",
    Icon: TrophyIcon as FeatureIcon,
  },
  {
    title: "Advanced progress analytics",
    description: "Track your estimated 1RM and long-term strength progression.",
    Icon: ChartIcon as FeatureIcon,
  },
  {
    title: "Full workout history",
    description: "Access every workout you have ever logged.",
    Icon: CalendarIcon as FeatureIcon,
  },
  {
    title: "No ads",
    description: "Enjoy Liftly without interruptions or advertisements.",
    Icon: ShieldIcon as FeatureIcon,
  },
];

export function Paywall({ savedAffiliateCode = null }: { savedAffiliateCode?: string | null }) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>(DEFAULT_PLAN);

  const goToDashboard = () => {
    haptic();
    router.replace(APP_HOME);
  };

  const trialSubline =
    plan === "noAds"
      ? "€4.99/month • Removes ads only"
      : plan === "monthly"
        ? "Then €5.99/month • Cancel anytime"
        : "Then €49.99/year • Cancel anytime";

  const ctaLabel = plan === "noAds" ? "Remove Ads" : "Start 7-Day Free Trial";

  const visibleFeatures =
    plan === "noAds"
      ? featureListItems.filter((item) => item.title === "No ads")
      : featureListItems;

  return (
    <section className="flex h-screen max-h-screen min-h-0 flex-col overflow-hidden bg-[#0f0f10] text-zinc-100">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-xl flex-col justify-between px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))]">
        {/* SECTION 1 — hero header + gold radial glow (fixed height band) */}
        <div className="-mx-3 shrink-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,170,0,0.18),rgba(255,170,0,0.06)_40%,transparent_70%)] px-3 pb-0 pt-0.5 text-center">
          <header>
            <h1 className="mb-2 text-[30px] font-bold leading-[1.15] tracking-[-0.5px] text-zinc-50">
              Train Smarter.
              <br />
              Get Stronger.
            </h1>
            <p className="mx-auto max-w-md px-1 text-sm leading-snug text-zinc-400">
              AI-powered strength insights and progress analytics.
            </p>
          </header>
        </div>

        {/* SECTION 2 — features (flexible; shrinks, no page scroll) */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-0.5">
          <ul
            className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden"
            aria-label={plan === "noAds" ? "No ads" : "Pro features"}
          >
            {visibleFeatures.map((item) => {
              const Icon = item.Icon;
              return (
                <li key={item.title} className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <div className="flex h-full min-h-0 flex-1 items-start gap-2.5 overflow-hidden rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-2 shadow-[0_0_20px_rgba(255,170,0,0.05)] transition-colors hover:bg-white/[0.05] active:bg-white/[0.07]">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center"
                      aria-hidden
                    >
                      <Icon size={ICON_PX} className={iconClass} />
                    </span>
                    <div className="min-h-0 min-w-0 flex-1 overflow-hidden text-left">
                      <p className="text-sm font-semibold leading-snug text-zinc-100">{item.title}</p>
                      <p className="mt-0.5 line-clamp-3 text-[13px] leading-[1.35] text-zinc-500">{item.description}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="shrink-0 px-0.5">
          <AffiliateCodeSection savedAffiliateCode={savedAffiliateCode} compact />
        </div>

        {/* SECTION 4 — pricing + CTA (fixed band at bottom) */}
        <div className="shrink-0 space-y-1.5">
          <div role="radiogroup" aria-label="Subscription plan">
            <div className="grid min-w-0 grid-cols-3 items-stretch gap-1.5 overflow-visible pt-0.5 sm:gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={plan === "noAds"}
                onClick={() => setPlan("noAds")}
                className={`min-w-0 origin-center rounded-[14px] p-2 text-left transition-all tap-feedback sm:p-2.5 ${
                  plan === "noAds"
                    ? "scale-[1.02] border-2 border-[#f59e0b] bg-white/[0.05] shadow-[0_0_20px_rgba(245,158,11,0.35),0_0_48px_rgba(245,158,11,0.12)] ring-1 ring-[#f59e0b]/45 hover:shadow-[0_0_24px_rgba(245,158,11,0.45),0_0_56px_rgba(245,158,11,0.15)]"
                    : "border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]"
                }`}
              >
                <span className="inline-block rounded-full border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-500 sm:px-2 sm:text-[10px]">
                  No ads
                </span>
                <p className="mt-1 text-[11px] font-bold leading-tight text-zinc-50 sm:mt-1.5 sm:text-xs">
                  €4.99 <span className="text-[9px] font-medium text-zinc-400 sm:text-[10px]">/ month</span>
                </p>
                <p className="mt-1 text-[9px] leading-snug text-zinc-500 sm:text-[10px]">Removes ads only</p>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={plan === "monthly"}
                onClick={() => setPlan("monthly")}
                className={`min-w-0 origin-center rounded-[14px] p-2 text-left transition-all tap-feedback sm:p-2.5 ${
                  plan === "monthly"
                    ? "scale-[1.02] border-2 border-[#f59e0b] bg-white/[0.05] shadow-[0_0_20px_rgba(245,158,11,0.35),0_0_48px_rgba(245,158,11,0.12)] ring-1 ring-[#f59e0b]/45 hover:shadow-[0_0_24px_rgba(245,158,11,0.45),0_0_56px_rgba(245,158,11,0.15)]"
                    : "border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]"
                }`}
              >
                <span className="inline-block rounded-full bg-[#f59e0b] px-1.5 py-0.5 text-[9px] font-semibold text-zinc-950 sm:px-2 sm:text-[10px]">
                  Most popular
                </span>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-zinc-500 sm:mt-1.5 sm:text-[10px]">
                  Pro
                </p>
                <p className="mt-0.5 text-[11px] font-bold leading-tight text-zinc-50 sm:text-xs">
                  €5.99 <span className="text-[9px] font-medium text-zinc-400 sm:text-[10px]">/ month</span>
                </p>
                <p className="mt-1 text-[9px] leading-snug text-zinc-500 sm:text-[10px]">Full Pro access</p>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={plan === "yearly"}
                onClick={() => setPlan("yearly")}
                className={`min-w-0 origin-center rounded-[14px] p-2 text-left transition-all tap-feedback sm:p-2.5 ${
                  plan === "yearly"
                    ? "scale-[1.02] border-2 border-[#f59e0b] bg-white/[0.02] shadow-[0_0_20px_rgba(245,158,11,0.35),0_0_48px_rgba(245,158,11,0.12)] ring-1 ring-[#f59e0b]/45 hover:shadow-[0_0_24px_rgba(245,158,11,0.45),0_0_56px_rgba(245,158,11,0.15)]"
                    : "border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]"
                }`}
              >
                <span className="inline-block rounded-full bg-[#f59e0b] px-1.5 py-0.5 text-[9px] font-semibold text-zinc-950 sm:px-2 sm:text-[10px]">
                  Best value
                </span>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-zinc-500 sm:mt-1.5 sm:text-[10px]">
                  Yearly Pro
                </p>
                <p className="mt-0.5 text-[11px] font-bold leading-tight text-zinc-50 sm:text-xs">
                  €49.99 <span className="text-[9px] font-medium text-zinc-400 sm:text-[10px]">/ year</span>
                </p>
                <p className="mt-0.5 text-[9px] font-semibold text-[#f59e0b] sm:text-[10px]">Save 30%</p>
                <p className="text-[9px] text-zinc-400 sm:text-[10px]">
                  €4.16 <span className="text-zinc-500">/ month</span>
                </p>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                // Dev paywall: trial purchase not wired yet — send user into the app.
                goToDashboard();
              }}
              className="w-full rounded-[14px] bg-gradient-to-r from-[#f59e0b] to-[#ffb020] px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_6px_20px_rgba(245,158,11,0.45)] transition-opacity hover:opacity-95 tap-feedback"
            >
              {ctaLabel}
            </button>
            <p className="text-center text-[10px] leading-tight text-zinc-400">{trialSubline}</p>
            <button
              type="button"
              onClick={goToDashboard}
              className="w-full py-1.5 text-center text-sm font-semibold text-zinc-400 transition-colors hover:text-zinc-300 tap-feedback"
            >
              Continue with limited version
            </button>
            <div className="mt-3">
              <PaywallLegalFooter compact />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
