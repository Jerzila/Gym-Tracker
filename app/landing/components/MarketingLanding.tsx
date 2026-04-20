"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Activity, BookOpen, Dumbbell, LineChart, Mail, Settings2, Trophy } from "lucide-react";
import { MuscleBalanceRadar, OneRMTrendChart, ProgressionLineChart } from "./ChartDecor";
import { LandingHeader } from "./LandingHeader";
import { PhoneMockup } from "./PhoneMockup";
import { Reveal } from "./Reveal";
import { StoreBadges } from "./StoreBadges";

const PREVIEW_SHOTS = [
  {
    src: "/landing/exercise-analytics-mockup.png",
    alt: "Liftly Exercise — PRs, weight over time, and estimated 1RM trends",
    caption: "PRs, charts & estimated 1RM",
    objectPosition: "50% 28%" as const,
  },
  {
    src: "/landing/rank-ladder-mockup.png",
    alt: "Liftly Strength Rank Ladder — Pro through GOAT tiers and lifter percentiles",
    caption: "Strength rank ladder & percentiles",
    objectPosition: "50% 18%" as const,
  },
];

const WEEKS = [
  { label: "Week 1", detail: "100 kg × 6" },
  { label: "Week 2", detail: "100 kg × 8" },
  { label: "Week 3", detail: "100 kg × 10" },
  { label: "Week 4", detail: "105 kg × 6", highlight: true },
];

const FEATURES = [
  {
    title: "Workout Logging",
    body: "Quickly record sets, reps, and weight with a flow built for the gym floor.",
    icon: Dumbbell,
  },
  {
    title: "Strength Analytics",
    body: "Track estimated 1RM and see how your lifts improve week over week.",
    icon: LineChart,
  },
  {
    title: "Muscle Insights",
    body: "Understand which muscle groups are strongest or need more attention.",
    icon: Activity,
  },
  {
    title: "Rankings & Progress",
    body: "See your strength level and compare progress with clear, motivating context.",
    icon: Trophy,
  },
] as const;

const PRO_BENEFITS = [
  "Deeper strength analytics across your history",
  "Extended progress timelines and trends",
  "Advanced insights into weak points and balance",
  "Detailed rankings and comparative context",
];

const SUPPORT_ITEMS: { title: string; body: ReactNode; icon: typeof Settings2 }[] = [
  {
    title: "In the app",
    body: "Open Liftly, go to your profile, then Settings—find account, notifications, and troubleshooting in one place.",
    icon: Settings2,
  },
  {
    title: "Help center",
    body: "We are putting together guides for logging, PRs, and Pro features. Check back soon for articles and FAQs.",
    icon: BookOpen,
  },
  {
    title: "Email the team",
    body: (
      <>
        Questions about billing, data, or the product? Reach us at{" "}
        <a
          href="mailto:support@liftlygym.com?subject=Liftly%20support"
          className="whitespace-nowrap font-medium text-amber-300/95 underline decoration-amber-400/35 underline-offset-2 transition-colors hover:text-amber-200 hover:decoration-amber-400/60"
        >
          support@liftlygym.com
        </a>{" "}
        and we will get back to you.
      </>
    ),
    icon: Mail,
  },
];

export function MarketingLanding() {
  return (
    <div id="top" className="landing-marketing relative min-h-dvh overflow-x-hidden bg-[#050506] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-[20%] top-[-10%] h-[55vh] w-[70vw] rounded-full bg-amber-500/[0.07] blur-[120px]" />
        <div className="absolute -right-[15%] top-[30%] h-[45vh] w-[55vw] rounded-full bg-violet-600/[0.06] blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[40vh] w-[90vw] -translate-x-1/2 rounded-full bg-amber-400/[0.04] blur-[100px]" />
      </div>

      <LandingHeader />

      <main className="relative z-10">
        {/* Hero */}
        <section
          className="relative flex min-h-[100dvh] flex-col justify-center overflow-x-clip px-4 pb-16 pt-24 sm:px-5 sm:pb-20 sm:pt-28 md:px-8 lg:pb-32 lg:pt-32"
          aria-labelledby="hero-heading"
        >
          <div className="mx-auto grid w-full min-w-0 max-w-[min(100%,390px)] gap-10 sm:max-w-6xl sm:gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-12">
            <Reveal className="min-w-0 text-center lg:text-left">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-amber-400/90 sm:mb-4">
                Strength tracking, elevated
              </p>
              <h1
                id="hero-heading"
                className="font-[family-name:var(--font-landing-display)] text-balance text-[clamp(1.875rem,calc(1rem+4.8vw),3.75rem)] font-semibold leading-[1.08] tracking-tight text-white"
              >
                Track Your Strength.
                <span className="mt-1 block text-zinc-300">Beat Your PRs.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-zinc-400 sm:mt-6 sm:text-lg lg:mx-0 lg:text-xl">
                Liftly helps you log workouts, track progressive overload, and understand your strength
                development—with clarity that serious lifters expect.
              </p>
              <div className="mt-8 flex w-full justify-center sm:mt-10 lg:justify-start">
                <StoreBadges />
              </div>
            </Reveal>
            <Reveal delayMs={120} className="flex min-w-0 justify-center lg:justify-end">
              <div className="relative w-full max-w-[min(100%,320px)] sm:max-w-none">
                <div className="pointer-events-none absolute inset-0 scale-110 overflow-hidden bg-gradient-to-t from-amber-500/20 via-transparent to-transparent blur-3xl" />
                <PhoneMockup
                  src="/landing/insights-strength-mockup.png"
                  alt="Liftly Insights — muscle strength visualization and rankings"
                  priority
                  objectPosition="50% 20%"
                  widthClass="mx-auto w-[min(268px,calc(100vw-2rem))] sm:w-[min(320px,50vw)] lg:w-[min(340px,42vw)]"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Product previews */}
        <section
          id="previews"
          className="scroll-mt-24 border-t border-white/[0.06] bg-zinc-950/40 px-4 py-9 sm:px-5 sm:py-12 md:px-8 md:py-14 lg:py-24 xl:py-32"
          aria-labelledby="previews-heading"
        >
          <div className="mx-auto min-w-0 max-w-[min(100%,390px)] sm:max-w-6xl">
            <Reveal>
              <h2
                id="previews-heading"
                className="font-[family-name:var(--font-landing-display)] text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl"
              >
                Built for lifters who train with intent.
              </h2>
              <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
                From the last rep of your session to the big picture of your strength, every screen is
                designed to keep you focused on progress.
              </p>
            </Reveal>

            <div className="mt-12 grid grid-cols-1 justify-items-center gap-12 sm:mt-16 sm:grid-cols-2 sm:gap-10 lg:mt-16 lg:gap-14">
              {PREVIEW_SHOTS.map((shot, i) => (
                <Reveal key={shot.src} delayMs={i * 80} className="w-full min-w-0 max-w-[min(100%,360px)]">
                  <div className="flex flex-col items-center">
                    <PhoneMockup
                      src={shot.src}
                      alt={shot.alt}
                      objectPosition={shot.objectPosition}
                      widthClass="mx-auto w-[min(252px,calc(100vw-2rem))] sm:w-[min(288px,calc(50vw-2.5rem))] lg:w-[min(300px,42vw)]"
                    />
                    <p className="mt-5 text-center text-sm font-medium text-zinc-400">{shot.caption}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Strength progress */}
        <section
          id="progress"
          className="scroll-mt-24 px-4 py-9 sm:px-5 sm:py-12 md:px-8 md:py-14 lg:py-24 xl:py-32"
          aria-labelledby="progress-heading"
        >
          <div className="mx-auto min-w-0 max-w-[min(100%,390px)] sm:max-w-6xl">
            <Reveal>
              <h2
                id="progress-heading"
                className="font-[family-name:var(--font-landing-display)] text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl"
              >
                Progress you can measure.
              </h2>
              <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
                Liftly tracks performance over time and surfaces when to add weight so progressive overload
                stays honest—not guesswork.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
              {WEEKS.map((w, i) => (
                <Reveal key={w.label} delayMs={i * 70}>
                  <div
                    className={`relative h-full rounded-2xl border p-5 transition-shadow duration-300 hover:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] sm:p-6 ${
                      w.highlight
                        ? "border-amber-400/35 bg-gradient-to-b from-amber-500/[0.12] to-zinc-900/80 shadow-[0_0_0_1px_rgba(251,191,36,0.12)_inset]"
                        : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.12]"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{w.label}</p>
                    <p className="mt-3 font-[family-name:var(--font-landing-display)] text-xl font-semibold text-white sm:text-2xl">
                      {w.detail}
                    </p>
                    {w.highlight ? (
                      <p className="mt-3 text-sm text-amber-200/90">Load increases when volume sticks.</p>
                    ) : (
                      <p className="mt-3 text-sm text-zinc-500">Same weight, more quality reps.</p>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section
          id="features"
          className="scroll-mt-24 border-t border-white/[0.06] bg-zinc-950/30 px-4 py-9 sm:px-5 sm:py-12 md:px-8 md:py-14 lg:py-24 xl:py-32"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto min-w-0 max-w-[min(100%,390px)] sm:max-w-6xl">
            <Reveal>
              <h2
                id="features-heading"
                className="font-[family-name:var(--font-landing-display)] text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl"
              >
                Everything you need to level up.
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <Reveal key={f.title} delayMs={i * 60}>
                    <div className="group h-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-[0_4px_40px_-20px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.05] hover:shadow-[0_28px_70px_-32px_rgba(245,158,11,0.12)] sm:p-8">
                      <div className="mb-5 inline-flex rounded-xl border border-white/10 bg-zinc-900/80 p-3 text-amber-400/95 ring-1 ring-white/[0.04] transition-transform duration-300 group-hover:scale-105">
                        <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
                      </div>
                      <h3 className="text-xl font-semibold text-white">{f.title}</h3>
                      <p className="mt-3 leading-relaxed text-zinc-400">{f.body}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Insights */}
        <section
          id="insights"
          className="scroll-mt-24 px-4 py-9 sm:px-5 sm:py-12 md:px-8 md:py-14 lg:py-24 xl:py-32"
          aria-labelledby="insights-heading"
        >
          <div className="mx-auto min-w-0 max-w-[min(100%,390px)] sm:max-w-6xl">
            <Reveal>
              <h2
                id="insights-heading"
                className="font-[family-name:var(--font-landing-display)] text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl"
              >
                Data that actually explains your training.
              </h2>
              <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
                Liftly turns raw sets and reps into strength progression, estimated 1RM trends, and muscle
                balance insight—so you always know where you are and what to push next.
              </p>
            </Reveal>

            <div className="mt-10 grid min-w-0 gap-6 sm:mt-14 sm:gap-8 lg:grid-cols-3">
              <Reveal>
                <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 transition-shadow duration-300 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.55)] sm:p-5">
                  <p className="text-sm font-medium text-zinc-300">Strength progression</p>
                  <p className="mt-1 text-xs text-zinc-500">Session-to-session trajectory</p>
                  <ProgressionLineChart className="mt-4 w-full" />
                </div>
              </Reveal>
              <Reveal delayMs={80}>
                <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 transition-shadow duration-300 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.55)] sm:p-5">
                  <p className="text-sm font-medium text-zinc-300">Estimated 1RM trends</p>
                  <p className="mt-1 text-xs text-zinc-500">Lift-specific intelligence</p>
                  <OneRMTrendChart className="mt-4 w-full" />
                </div>
              </Reveal>
              <Reveal delayMs={160}>
                <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 transition-shadow duration-300 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.55)] sm:p-5">
                  <p className="text-sm font-medium text-zinc-300">Muscle balance</p>
                  <p className="mt-1 text-xs text-zinc-500">Where you shine—and where to build</p>
                  <MuscleBalanceRadar className="mt-4 w-full" />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Pro */}
        <section
          id="pro"
          className="scroll-mt-24 px-4 pb-12 pt-2 sm:px-5 sm:pb-16 sm:pt-4 md:px-8 lg:pb-32"
          aria-labelledby="pro-heading"
        >
          <Reveal>
            <div className="relative mx-auto max-w-[min(100%,390px)] overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.14] via-zinc-950 to-zinc-950 p-[1px] shadow-[0_40px_100px_-40px_rgba(245,158,11,0.35)] sm:max-w-6xl sm:rounded-[2rem]">
              <div className="relative rounded-[1.85rem] bg-zinc-950/95 px-5 py-10 sm:rounded-[1.96rem] sm:px-12 sm:py-16">
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/15 blur-[80px]" />
                <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-violet-500/10 blur-[90px]" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/90">Liftly Pro</p>
                  <h2
                    id="pro-heading"
                    className="mt-3 font-[family-name:var(--font-landing-display)] text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl"
                  >
                    Go deeper into your strength story.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
                    Upgrade for premium analytics and extended history—built for athletes who want the full
                    picture, not a snapshot.
                  </p>
                  <ul className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4">
                    {PRO_BENEFITS.map((line) => (
                      <li key={line} className="flex gap-3 text-zinc-300">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
                        <span className="leading-relaxed">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Blog — placeholder for future content */}
        <section
          id="blog"
          className="scroll-mt-24 border-t border-white/[0.06] px-4 py-9 sm:px-5 sm:py-12 md:px-8 md:py-14 lg:py-24"
          aria-labelledby="blog-heading"
        >
          <div className="mx-auto max-w-2xl min-w-0 px-0 text-center">
            <Reveal>
              <h2
                id="blog-heading"
                className="font-[family-name:var(--font-landing-display)] text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl"
              >
                Blog
              </h2>
              <p className="mt-4 text-pretty text-base text-zinc-400 sm:text-lg">
                Training ideas, product updates, and strength science—coming soon.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Support */}
        <section
          id="support"
          className="scroll-mt-24 border-t border-white/[0.06] bg-zinc-950/25 px-4 py-9 sm:px-5 sm:py-12 md:px-8 md:py-14 lg:py-24 xl:py-32"
          aria-labelledby="support-heading"
        >
          <div className="mx-auto min-w-0 max-w-[min(100%,390px)] sm:max-w-6xl">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400/90">Help & support</p>
              <h2
                id="support-heading"
                className="mt-3 font-[family-name:var(--font-landing-display)] text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl"
              >
                We have got your back.
              </h2>
              <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
                Whether you are setting up your first workout or digging into analytics, here is how to get
                answers fast.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {SUPPORT_ITEMS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <Reveal key={item.title} delayMs={i * 70}>
                    <div className="group flex h-full flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-[0_4px_40px_-20px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.05] hover:shadow-[0_28px_70px_-32px_rgba(245,158,11,0.1)] sm:p-8">
                      <div className="mb-5 inline-flex w-fit rounded-xl border border-white/10 bg-zinc-900/80 p-3 text-amber-400/95 ring-1 ring-white/[0.04] transition-transform duration-300 group-hover:scale-105">
                        <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
                      </div>
                      <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                      <p className="mt-3 flex-1 leading-relaxed text-zinc-400">{item.body}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section
          id="download"
          className="scroll-mt-24 border-t border-white/[0.06] bg-gradient-to-b from-zinc-950/80 to-black px-4 py-10 sm:px-5 sm:py-14 md:px-8 md:py-16 lg:py-28"
          aria-labelledby="cta-heading"
        >
          <div className="mx-auto min-w-0 max-w-[min(100%,390px)] text-center sm:max-w-3xl">
            <Reveal>
              <h2
                id="cta-heading"
                className="font-[family-name:var(--font-landing-display)] text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl xl:text-[2.75rem]"
              >
                Start Tracking Your Strength Today
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-zinc-400 sm:mt-5 sm:text-lg">
                Download Liftly and bring serious structure to every session.
              </p>
              <div className="mt-8 flex w-full justify-center sm:mt-10">
                <StoreBadges />
              </div>
            </Reveal>
          </div>
        </section>

        <footer className="border-t border-white/[0.06] px-4 py-8 sm:px-5 sm:py-10 md:px-8">
          <div className="mx-auto flex min-w-0 max-w-6xl flex-col items-center justify-between gap-4 text-center text-sm text-zinc-600 sm:flex-row sm:text-left">
            <div className="flex min-w-0 flex-col items-center gap-2 sm:flex-row sm:gap-3">
              <Image
                src="/landing/liftly-logo.png"
                alt=""
                width={859}
                height={1024}
                className="h-7 w-auto object-contain opacity-80"
              />
              <p>© {new Date().getFullYear()} Liftly. All rights reserved.</p>
            </div>
            <div className="flex gap-6">
              <Link href="/privacy" className="transition-colors hover:text-zinc-400">
                Privacy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-zinc-400">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
