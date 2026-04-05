import Link from "next/link";
import { PreviewImage } from "./PreviewImage";

export const dynamic = "force-static";

const APP_STORE_HREF = "https://apps.apple.com/";
const PLAY_STORE_HREF = "https://play.google.com/store";

const previewScreens = [
  {
    src: "/IMG_2669.PNG",
    alt: "Workout logging in Liftly",
    caption: "Workout logging",
    objectPosition: "50% 76%" as const,
  },
  {
    src: "/insights-preview.PNG",
    alt: "Strength charts in Liftly",
    caption: "Strength charts",
    objectPosition: "50% 50%" as const,
  },
  {
    src: "/muscle diagram2.svg",
    alt: "Muscle strength diagram in Liftly",
    caption: "Muscle strength",
    objectPosition: "50% 50%" as const,
  },
  {
    src: "/elite.png",
    alt: "Strength rankings and tiers in Liftly",
    caption: "Rankings",
    objectPosition: "50% 45%" as const,
  },
];

function StoreButtons({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center ${className ?? ""}`}>
      <a
        href={APP_STORE_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 text-center text-sm font-semibold text-amber-100 shadow-[0_0_24px_rgba(245,158,11,0.12)] transition hover:bg-amber-500/20"
      >
        Download on App Store
      </a>
      <a
        href={PLAY_STORE_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-600 bg-zinc-900/80 px-5 py-2.5 text-center text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800"
      >
        Get it on Google Play
      </a>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="w-full pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:pb-20 sm:pt-14">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(245,158,11,0.22),transparent_55%)]"
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">
            Liftly
          </p>
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-4xl md:text-5xl">
            Track Your Strength. Beat Your PRs.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg">
            Liftly is the gym tracker built for progressive overload. Log workouts, monitor strength
            gains, and understand your muscle development.
          </p>
          <div className="mt-8 flex w-full max-w-md flex-col items-stretch gap-3 sm:max-w-none">
            <StoreButtons />
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700/80 bg-transparent px-5 py-2.5 text-center text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-50"
            >
              Open web app
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-zinc-800/80 bg-zinc-950/50 px-4 py-12">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
          {[
            { title: "Built for serious lifters", sub: "Focused on strength, not noise." },
            { title: "Track PRs and strength progress", sub: "Every set counts toward your trend." },
            { title: "Visualize muscle balance", sub: "See strong and weak points clearly." },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-center shadow-sm sm:text-left"
            >
              <p className="font-semibold text-zinc-100">{card.title}</p>
              <p className="mt-2 text-sm text-zinc-500">{card.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-zinc-50 sm:text-3xl">Why Liftly</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-zinc-500 sm:text-base">
            Everything you need to train with intent and measure real progress.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {[
              {
                title: "Log workouts instantly",
                body: "Track sets, reps, and weight in seconds.",
              },
              {
                title: "Progressive overload tracking",
                body: "Liftly recommends when to increase weight based on rep targets.",
              },
              {
                title: "Strength insights",
                body: "View charts showing estimated 1RM and strength gains.",
              },
              {
                title: "Muscle rankings",
                body: "See which muscles are strongest and weakest using the body map.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-zinc-950/80 p-6"
              >
                <h3 className="text-lg font-semibold text-zinc-100">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App preview */}
      <section className="border-t border-zinc-800/80 bg-[#070708] px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-zinc-50 sm:text-3xl">Inside the app</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-zinc-500">
            A quick look at logging, analytics, and how Liftly visualizes your training.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
            {previewScreens.map((screen, i) => (
              <div key={screen.caption} className="flex flex-col items-center">
                <div className="relative w-full max-w-[240px] sm:max-w-[260px] lg:max-w-[280px]">
                  <div
                    className="absolute -inset-1 rounded-[2.4rem] bg-gradient-to-b from-zinc-600/40 to-zinc-900/80 blur-sm"
                    aria-hidden
                  />
                  <div className="relative rounded-[2.25rem] border border-zinc-700/90 bg-zinc-950 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
                    <div className="relative mx-auto h-2 w-16 rounded-full bg-zinc-800" aria-hidden />
                    <div className="relative mt-2 aspect-[9/19] w-full overflow-hidden rounded-[1.85rem] bg-zinc-900">
                      <PreviewImage
                        src={screen.src}
                        alt={screen.alt}
                        className="object-cover"
                        sizes="(max-width: 768px) 85vw, 280px"
                        priority={i === 0}
                        style={{ objectPosition: screen.objectPosition }}
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm font-medium text-zinc-400">{screen.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Progressive overload */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-zinc-50 sm:text-3xl">Progressive overload, made obvious</h2>
          <p className="mt-3 text-sm text-zinc-500 sm:text-base">
            Small wins add up. Liftly tracks progression automatically so you know when it is time to
            add load.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-2xl space-y-3">
          {[
            { week: "Week 1", detail: "100 kg × 6 reps" },
            { week: "Week 2", detail: "100 kg × 8 reps" },
            { week: "Week 3", detail: "100 kg × 10 reps" },
            { week: "Week 4", detail: "Increase weight to 105 kg", highlight: true },
          ].map((row, idx) => (
            <div
              key={row.week}
              className={`flex flex-col gap-1 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                row.highlight
                  ? "border-amber-500/50 bg-amber-500/10"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">
                  {idx + 1}
                </span>
                <span className="text-sm font-semibold text-zinc-200">{row.week}</span>
              </div>
              <span
                className={`text-sm sm:text-right ${row.highlight ? "font-semibold text-amber-200" : "text-zinc-400"}`}
              >
                {row.detail}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-500/25 bg-gradient-to-b from-amber-500/10 via-zinc-900/40 to-zinc-950 px-6 py-12 text-center sm:px-10">
          <h2 className="text-2xl font-bold text-zinc-50 sm:text-3xl">
            Start Tracking Your Strength Today
          </h2>
          <p className="mt-3 text-sm text-zinc-400 sm:text-base">
            Get Liftly on your phone and bring clarity to every session.
          </p>
          <div className="mt-8 flex justify-center">
            <StoreButtons />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 px-4 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-lg font-semibold tracking-tight text-zinc-100">Liftly</p>
          <nav className="flex flex-col gap-3 text-sm sm:flex-row sm:gap-8">
            <Link href="/privacy" className="text-zinc-400 transition hover:text-zinc-200">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-zinc-400 transition hover:text-zinc-200">
              Terms
            </Link>
            <a
              href="mailto:yoav.schlach@icloud.com"
              className="text-zinc-400 transition hover:text-zinc-200"
            >
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
