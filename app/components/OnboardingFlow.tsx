"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/actions/profile";
import { COUNTRIES, getFlagEmoji } from "@/lib/countries";
import { haptic } from "@/lib/haptic";
import { getAgeFromBirthday } from "@/lib/age";
import { cmToFtIn, ftInToCm, kgToLbs, lbsToKg } from "@/lib/units";
import type { Profile } from "@/lib/types";

const TOTAL_STEPS = 4; // name+DOB+gender, units, height&weight, country (welcome is step 0)
const STEP_TITLES = [
  "Basic Info",
  "Choose your units",
  "Height & weight",
  "Where are you from?",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const AGE_MIN = 13;
const AGE_MAX = 90;
const HEIGHT_CM_MIN = 120;
const HEIGHT_CM_MAX = 230;
const WEIGHT_KG_MIN = 30;
const WEIGHT_KG_MAX = 200;

// Imperial: 4'0" to 7'6"; 70 lb to 440 lb
const HEIGHT_FT_MIN = 4;
const HEIGHT_FT_MAX = 7;
const HEIGHT_IN_MAX_LAST_FT = 6; // 7'6" max
const WEIGHT_LBS_MIN = 70;
const WEIGHT_LBS_MAX = 440;

function clampHeightFtIn(ft: number, in_: number): { ft: number; in: number } {
  let f = Math.max(HEIGHT_FT_MIN, Math.min(HEIGHT_FT_MAX, ft));
  let i = in_;
  if (f === HEIGHT_FT_MAX) i = Math.min(HEIGHT_IN_MAX_LAST_FT, Math.max(0, i));
  else i = Math.max(0, Math.min(11, i));
  return { ft: f, in: i };
}

type OnboardingData = {
  firstName: string;
  birthday: string;
  gender: "male" | "female" | "prefer_not_to_say" | null;
  heightCm: number;
  weightKg: number;
  units: "metric" | "imperial";
  country: string;
};

function parseBirthday(y: number, m: number, d: number): string {
  const month = String(m).padStart(2, "0");
  const day = String(d).padStart(2, "0");
  return `${y}-${month}-${day}`;
}

// ----- Wheel picker (DOB and other steps) -----
const ROW_HEIGHT = 48;
const ROW_HEIGHT_COMPACT = 36;

function WheelColumn<T>({
  items,
  value,
  onChange,
  format = String,
  compact = false,
}: {
  items: T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rowH = compact ? ROW_HEIGHT_COMPACT : ROW_HEIGHT;
  const index = items.indexOf(value);
  const isControlled = index >= 0;

  useEffect(() => {
    if (!ref.current || !isControlled) return;
    ref.current.scrollTop = index * rowH;
  }, [index, isControlled, rowH]);

  const handleScroll = useCallback(() => {
    if (!ref.current) return;
    const i = Math.round(ref.current.scrollTop / rowH);
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    const next = items[clamped];
    if (next !== value) onChange(next);
  }, [items, value, onChange, rowH]);

  return (
    <div
      ref={ref}
      className="onboarding-wheel onboarding-wheel-mask flex-1 overflow-y-auto overscroll-contain"
      style={{ height: rowH * 3 }}
      onScroll={handleScroll}
    >
      <div style={{ height: rowH }} aria-hidden />
      {items.map((item, i) => (
        <div
          key={i}
          className="onboarding-wheel-option flex flex-shrink-0 items-center justify-center transition-colors"
          style={{ height: rowH }}
          data-selected={item === value}
        >
          <span
            className={
              item === value
                ? "font-bold text-zinc-100"
                : "text-zinc-500"
            }
            style={{ fontSize: compact ? "0.875rem" : undefined }}
          >
            {format(item)}
          </span>
        </div>
      ))}
      <div style={{ height: rowH }} aria-hidden />
    </div>
  );
}

// ----- iOS-style wheel picker (height/weight): 220px container, 44px rows, center offset -----
const WHEEL_CONTAINER_HEIGHT = 220;
const WHEEL_ROW_HEIGHT = 44;
const WHEEL_CENTER_OFFSET = WHEEL_CONTAINER_HEIGHT / 2 - WHEEL_ROW_HEIGHT / 2; // 88px padding

function PickerWheel<T>({
  items,
  value,
  onChange,
  format = String,
}: {
  items: T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnnouncedIndexRef = useRef<number>(-1);

  const valueIndex = items.indexOf(value);
  const isControlled = valueIndex >= 0;

  // Initial scroll and when value changes from parent: center the row. With 88px padding,
  // scrollTop = index * rowHeight centers the row. No animation (behavior: "auto").
  useLayoutEffect(() => {
    if (!scrollRef.current || !isControlled) return;
    const scrollTop = valueIndex * WHEEL_ROW_HEIGHT;
    scrollRef.current.scrollTo({ top: scrollTop, behavior: "auto" });
    lastAnnouncedIndexRef.current = valueIndex;
  }, [valueIndex, isControlled]);

  // After scroll finishes: compute centered row index and update value. Do NOT scrollTo here
  // so we don't fight native momentum / inertia.
  const handleScrollEnd = useCallback(() => {
    if (!scrollRef.current || items.length === 0) return;
    const scrollTop = scrollRef.current.scrollTop;
    const index = Math.round(scrollTop / WHEEL_ROW_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    if (clamped !== lastAnnouncedIndexRef.current) {
      lastAnnouncedIndexRef.current = clamped;
      const next = items[clamped];
      if (next !== value) {
        onChange(next);
        haptic();
      }
    }
  }, [items, value, onChange]);

  // Debounce scroll: only detect center value after scrolling stops (120ms).
  const handleScroll = useCallback(() => {
    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    scrollEndTimerRef.current = setTimeout(() => {
      scrollEndTimerRef.current = null;
      handleScrollEnd();
    }, 120);
  }, [handleScrollEnd]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scrollend", handleScrollEnd);
    return () => {
      el.removeEventListener("scrollend", handleScrollEnd);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    };
  }, [handleScrollEnd]);

  return (
    <div className="wheel-picker-outer">
      <div
        ref={scrollRef}
        className="wheel-picker-scroll"
        onScroll={handleScroll}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className="wheel-picker-row"
            data-selected={item === value}
          >
            <span>{format(item)}</span>
          </div>
        ))}
      </div>
      <div className="wheel-picker-fade wheel-picker-fade-top" aria-hidden />
      <div className="wheel-picker-fade wheel-picker-fade-bottom" aria-hidden />
      <div className="wheel-picker-highlight" aria-hidden />
    </div>
  );
}

// ----- Units screen: kg.png / lb.png visual -----
function UnitsKettlebellVisual({ unit }: { unit: "metric" | "imperial" }) {
  const [scale, setScale] = useState(1);
  const prevUnit = useRef(unit);

  useEffect(() => {
    if (prevUnit.current !== unit) {
      prevUnit.current = unit;
      setScale(0.95);
      const t = setTimeout(() => setScale(1), 50);
      return () => clearTimeout(t);
    }
  }, [unit]);

  return (
    <div
      className="mt-8 flex w-full flex-col items-center justify-center transition-transform duration-200 ease-out"
      style={{ transform: `scale(${scale})` }}
    >
      <div className="relative flex h-[320px] w-[320px] flex-shrink-0 items-center justify-center rounded-2xl bg-zinc-950 p-6">
        <div className="relative h-[260px] w-[260px] flex-shrink-0 overflow-hidden rounded-xl bg-amber-500">
          <img
            src="/kg.png"
            alt="Metric (kg)"
            className={`absolute inset-0 h-full w-full object-cover object-center invert mix-blend-multiply transition-opacity duration-200 ${unit === "metric" ? "opacity-100" : "opacity-0"}`}
          />
          <img
            src="/lbs.png"
            alt="Imperial (lbs)"
            className={`absolute inset-0 h-full w-full object-cover object-center invert mix-blend-multiply transition-opacity duration-200 ${unit === "imperial" ? "opacity-100" : "opacity-0"}`}
          />
        </div>
      </div>
    </div>
  );
}

type OnboardingFlowProps = { profile: Profile | null };

export function OnboardingFlow({ profile }: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(() => {
    const firstName = profile?.name?.trim() ?? "";
    const b = profile?.birthday;
    const h = profile?.height ?? 170;
    const w = profile?.body_weight ?? 60;
    const u = profile?.units ?? "metric";
    const g = profile?.gender;
    const c = profile?.country ?? "";
    return {
      firstName,
      birthday: b ?? "",
      gender: g === "male" || g === "female" || g === "prefer_not_to_say" ? g : null,
      heightCm: h,
      weightKg: w,
      units: u === "imperial" ? "imperial" : "metric",
      country: c,
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive DOB parts for wheel (default: 25 years old)
  const defaultYear = new Date().getFullYear() - 25;
  const years = Array.from(
    { length: AGE_MAX - AGE_MIN + 1 },
    (_, i) => new Date().getFullYear() - AGE_MAX + i
  ).reverse();
  const [dobYear, setDobYear] = useState(defaultYear);
  const [dobMonth, setDobMonth] = useState(6);
  const [dobDay, setDobDay] = useState(15);
  useEffect(() => {
    if (data.birthday) {
      const [y, m, d] = data.birthday.split("-").map(Number);
      setDobYear(y);
      setDobMonth(m);
      setDobDay(Math.min(d, 28));
    }
  }, []);
  useEffect(() => {
    const daysInMonth = new Date(dobYear, dobMonth, 0).getDate();
    const day = Math.min(dobDay, daysInMonth);
    setData((prev) => ({
      ...prev,
      birthday: parseBirthday(dobYear, dobMonth, day),
    }));
  }, [dobYear, dobMonth, dobDay]);

  const heightMetricOptions = Array.from(
    { length: HEIGHT_CM_MAX - HEIGHT_CM_MIN + 1 },
    (_, i) => HEIGHT_CM_MIN + i
  );
  const weightMetricOptions = Array.from(
    { length: WEIGHT_KG_MAX - WEIGHT_KG_MIN + 1 },
    (_, i) => WEIGHT_KG_MIN + i
  );
  const heightFtOptions = Array.from(
    { length: HEIGHT_FT_MAX - HEIGHT_FT_MIN + 1 },
    (_, i) => HEIGHT_FT_MIN + i
  );
  const heightInOptionsForFt = (ft: number) =>
    Array.from(
      { length: ft === HEIGHT_FT_MAX ? HEIGHT_IN_MAX_LAST_FT + 1 : 12 },
      (_, i) => i
    );
  const weightLbsOptions = Array.from(
    { length: WEIGHT_LBS_MAX - WEIGHT_LBS_MIN + 1 },
    (_, i) => WEIGHT_LBS_MIN + i
  );

  const rawFtIn = cmToFtIn(data.heightCm);
  const { ft: heightFt, in: heightIn } = clampHeightFtIn(rawFtIn.ft, rawFtIn.in);
  const weightLbs = Math.max(WEIGHT_LBS_MIN, Math.min(WEIGHT_LBS_MAX, kgToLbs(data.weightKg)));

  const age = data.birthday ? getAgeFromBirthday(data.birthday) : null;
  const isWelcome = step === 0;
  const formStep = step - 1; // 0..3 when step >= 1
  const canContinue =
    isWelcome ||
    (step === 1 && data.firstName.trim() !== "" && !!data.birthday && age !== null && age >= AGE_MIN && age <= AGE_MAX && data.gender !== null) ||
    (step === 2 && true) ||
    (step === 3 && true) ||
    (step === 4 && data.country !== "");

  const handleBack = () => {
    haptic();
    setStep((s) => Math.max(0, s - 1));
    setError(null);
  };

  const handleContinue = async () => {
    haptic();
    if (step === 0) {
      setStep(1);
      setError(null);
      return;
    }
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      setError(null);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await completeOnboarding({
        name: data.firstName.trim() || null,
        birthday: data.birthday,
        height: data.heightCm,
        weight: data.weightKg,
        units: data.units,
        gender: data.gender,
        country: data.country || null,
      });
      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      router.refresh();
      router.replace("/");
    } catch {
      setError("Something went wrong.");
      setSubmitting(false);
    }
  };

  const progress = step === 0 ? 0 : (step / TOTAL_STEPS) * 100;

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-100">
      {/* Progress bar */}
      <div className="h-1 w-full bg-zinc-800">
        <div
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Welcome screen (step 0) */}
      {isWelcome ? (
        <div className="flex min-h-dvh flex-col">
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
            {/* Logo */}
            <p className="mb-12 text-2xl font-semibold tracking-wide text-amber-500">
              Liftly
            </p>
            {/* Title */}
            <h1 className="text-center text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
              Welcome to Liftly
            </h1>
            <p className="mt-3 text-center text-lg font-medium text-amber-400/90">
              Your personal strength tracker.
            </p>
            {/* Description */}
            <div className="mt-10 max-w-sm space-y-4 text-center text-zinc-400">
              <p>
                Track your workouts, see your progress, and unlock powerful training insights.
              </p>
              <p>
                Before you begin, we&apos;ll ask a few quick questions to personalize your experience and make sure your data is as accurate as possible.
              </p>
              <p>It takes less than a minute.</p>
            </div>
          </div>
          {/* Fixed bottom: button + hint */}
          <div className="border-t border-zinc-800 bg-zinc-950 px-4 pb-[env(safe-area-inset-bottom)] pt-6">
            <button
              type="button"
              onClick={handleContinue}
              className="tap-feedback w-full rounded-2xl bg-amber-500 py-4 text-base font-semibold text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-[0.99]"
            >
              Start Setup
            </button>
            <p className="mt-3 text-center text-xs text-zinc-500">
              Takes ~30 seconds
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Header with back */}
          <header className="flex items-center px-4 py-3">
            <button
              type="button"
              onClick={handleBack}
              className="tap-feedback -ml-1 rounded-lg px-2 py-2 text-zinc-400 hover:text-zinc-200"
              aria-label="Back"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </header>

          <div className="flex flex-1 flex-col px-4 pb-32">
            <h1 className="text-center text-xl font-semibold text-zinc-100">
              {STEP_TITLES[formStep]}
            </h1>

            {/* Step content */}
            {step === 1 && (
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-zinc-400">First name</span>
                  <input
                    type="text"
                    value={data.firstName}
                    onChange={(e) => setData((prev) => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Your first name"
                    className="w-full rounded-xl border-2 border-zinc-700 bg-zinc-800/80 px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    autoComplete="given-name"
                  />
                </label>
                <div>
                  <span className="mb-1 block text-sm font-medium text-zinc-400">Date of birth</span>
                  <div className="flex gap-1">
                    <WheelColumn
                      compact
                      items={MONTHS}
                      value={MONTHS[dobMonth - 1]}
                      onChange={(m) => {
                        haptic();
                        setDobMonth(MONTHS.indexOf(m) + 1);
                      }}
                    />
                    <WheelColumn
                      compact
                      items={Array.from({ length: 31 }, (_, i) => i + 1)}
                      value={dobDay}
                      onChange={(d) => {
                        haptic();
                        setDobDay(d);
                      }}
                      format={(n) => String(n)}
                    />
                    <WheelColumn
                      compact
                      items={years}
                      value={dobYear}
                      onChange={(y) => {
                        haptic();
                        setDobYear(y);
                      }}
                      format={(n) => String(n)}
                    />
                  </div>
                </div>
                <div>
                  <span className="mb-1 block text-sm font-medium text-zinc-400">Gender</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "male" as const, label: "Male", emoji: "👨" },
                      { value: "female" as const, label: "Female", emoji: "👩" },
                      { value: "prefer_not_to_say" as const, label: "Prefer not to say", emoji: "❌" },
                    ].map(({ value, label, emoji }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          haptic();
                          setData((prev) => ({ ...prev, gender: value }));
                        }}
                        className={`tap-feedback flex flex-col items-center gap-0.5 rounded-xl border-2 px-2 py-2.5 text-center transition-colors ${
                          data.gender === value
                            ? "border-amber-500 bg-amber-500/20 text-amber-400"
                            : "border-zinc-700 bg-zinc-800/80 text-zinc-400 hover:border-zinc-600"
                        }`}
                      >
                        <span className="text-xl" aria-hidden>{emoji}</span>
                        <span className="text-xs font-medium leading-tight">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mt-6 flex flex-col items-center">
                <div className="grid w-full grid-cols-2 gap-4">
                  {(["metric", "imperial"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => {
                        haptic();
                        setData((prev) => ({ ...prev, units: u }));
                      }}
                      className={`tap-feedback rounded-2xl border-2 px-6 py-6 text-lg font-medium transition-colors ${
                        data.units === u
                          ? "border-amber-500 bg-amber-500/20 text-amber-400"
                          : "border-zinc-700 bg-zinc-800/80 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      {u === "metric" ? "Metric" : "Imperial"}
                    </button>
                  ))}
                </div>
                <UnitsKettlebellVisual unit={data.units} />
              </div>
            )}

            {step === 3 && (
          <div className="mt-8 flex justify-center gap-12">
            <div className="flex flex-col items-center">
              <span className="mb-2 text-sm font-medium text-zinc-400">
                {data.units === "metric" ? "Height (cm)" : "Height"}
              </span>
              {data.units === "metric" ? (
                <PickerWheel
                  items={heightMetricOptions}
                  value={data.heightCm}
                  onChange={(v) => setData((prev) => ({ ...prev, heightCm: v }))}
                  format={(n) => String(n)}
                />
              ) : (
                <div className="flex items-center gap-0.5">
                  <PickerWheel
                    items={heightFtOptions}
                    value={heightFt}
                    onChange={(ft) => {
                      const inClamped =
                        ft === HEIGHT_FT_MAX && heightIn > HEIGHT_IN_MAX_LAST_FT
                          ? HEIGHT_IN_MAX_LAST_FT
                          : heightIn;
                      setData((prev) => ({
                        ...prev,
                        heightCm: ftInToCm(ft, inClamped),
                      }));
                    }}
                    format={(n) => String(n)}
                  />
                  <span className="text-2xl font-medium text-zinc-400" aria-hidden="true">.</span>
                  <PickerWheel
                    items={heightInOptionsForFt(heightFt)}
                    value={heightIn > HEIGHT_IN_MAX_LAST_FT && heightFt === HEIGHT_FT_MAX ? HEIGHT_IN_MAX_LAST_FT : heightIn}
                    onChange={(in_) =>
                      setData((prev) => ({
                        ...prev,
                        heightCm: ftInToCm(heightFt, in_),
                      }))
                    }
                    format={(n) => String(n)}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col items-center">
              <span className="mb-2 flex items-center gap-1.5 text-sm font-medium text-zinc-400">
                <span>Weight</span>
                <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs font-semibold text-amber-400">
                  {data.units === "metric" ? "kg" : "lb"}
                </span>
              </span>
              {data.units === "metric" ? (
                <PickerWheel
                  items={weightMetricOptions}
                  value={data.weightKg}
                  onChange={(v) => setData((prev) => ({ ...prev, weightKg: v }))}
                  format={(n) => String(n)}
                />
              ) : (
                <PickerWheel
                  items={weightLbsOptions}
                  value={weightLbs}
                  onChange={(lbs) =>
                    setData((prev) => ({ ...prev, weightKg: lbsToKg(lbs) }))
                  }
                  format={(n) => String(n)}
                />
              )}
            </div>
          </div>
        )}

            {step === 4 && (
          <CountryStep
            value={data.country}
            onChange={(code) => {
              haptic();
              setData((prev) => ({ ...prev, country: code }));
            }}
          />
        )}
      </div>

      {!isWelcome && error && (
        <p className="px-4 pb-2 text-center text-sm text-red-400">{error}</p>
      )}

      {/* Continue button - fixed bottom (form steps only) */}
      {!isWelcome && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950 px-4 pb-[env(safe-area-inset-bottom)] pt-4">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue || submitting}
            className="tap-feedback w-full rounded-2xl bg-amber-500 py-4 text-base font-semibold text-zinc-950 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 disabled:shadow-none hover:bg-amber-400 active:scale-[0.99]"
          >
            {submitting ? "Saving…" : step === TOTAL_STEPS ? "Finish" : "Continue"}
          </button>
        </div>
      )}
        </>
      )}
    </div>
  );
}

// ----- Country search step -----
function CountryStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = search.trim()
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : COUNTRIES;

  return (
    <div className="mt-6">
      <input
        type="search"
        placeholder="Search countries…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-2xl border-2 border-zinc-700 bg-zinc-800/80 px-4 py-3.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        autoComplete="off"
      />
      <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900/95">
        {filtered.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => onChange(c.code)}
            className={`tap-feedback flex w-full items-center gap-2 px-4 py-3 text-left ${
              c.code === value
                ? "bg-amber-500/20 text-amber-400"
                : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <span>{getFlagEmoji(c.code)}</span>
            <span>{c.name}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-4 py-4 text-zinc-500">No countries match.</p>
        )}
      </div>
    </div>
  );
}
