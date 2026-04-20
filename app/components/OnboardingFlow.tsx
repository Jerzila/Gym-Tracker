"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/actions/profile";
import { COUNTRIES } from "@/lib/countries";
import { haptic } from "@/lib/haptic";
import { getAgeFromBirthday } from "@/lib/age";
import { cmToFtIn, ftInToCm, kgToLbs, lbsToKg } from "@/lib/units";
import type { Profile } from "@/lib/types";
import { localCalendarDateYYYYMMDD } from "@/lib/localCalendarDate";
import { epleyEstimated1RM, strengthScoreToRank, type StrengthRankMuscle } from "@/lib/strengthRanking";
import { RankBadge } from "@/app/components/RankBadge";
import type { RankSlug } from "@/lib/rankBadges";
import { FemaleIcon, MaleIcon, PreferNotToSayIcon } from "@/components/icons";
import { FlagIcon } from "@/app/components/FlagIcon";
import { appHref } from "@/lib/appRoutes";

const TOTAL_STEPS = 5; // name+DOB+gender, units, height&weight, country, strength-rank (welcome is step 0)
const STEP_TITLES = [
  "Basic Info",
  "Choose your units",
  "Height & weight",
  "Where are you from?",
  "Find your strength rank",
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

type StrengthCategory = "chest" | "back" | "shoulders" | "arms" | "legs";

function strengthCategoryToLabel(c: StrengthCategory): string {
  if (c === "chest") return "Chest";
  if (c === "back") return "Back";
  if (c === "shoulders") return "Shoulder";
  if (c === "arms") return "Arms";
  return "Legs";
}

function strengthCategoryToMuscle(c: StrengthCategory): StrengthRankMuscle {
  if (c === "legs") return "legs";
  if (c === "back") return "back";
  if (c === "shoulders") return "shoulders";
  if (c === "arms") return "biceps";
  return "chest";
}

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
            src="/kg.svg"
            alt="Metric (kg)"
            className={`absolute inset-0 h-full w-full object-cover object-center invert mix-blend-multiply transition-opacity duration-200 ${unit === "metric" ? "opacity-100" : "opacity-0"}`}
          />
          <img
            src="/lbs.svg"
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
  const [countrySearch, setCountrySearch] = useState("");
  const [logWorkoutPressed, setLogWorkoutPressed] = useState(false);
  const [logWorkoutLoading, setLogWorkoutLoading] = useState(false);

  // Strength rank mini-flow (step 5)
  // 0 = category, 1 = exercise+log, 2 = calculating, 3 = reveal
  const [rankSubStep, setRankSubStep] = useState<0 | 1 | 2 | 3>(0);
  const [rankCategory, setRankCategory] = useState<StrengthCategory | null>(null);
  const [rankExercise, setRankExercise] = useState<string | null>(null);
  const [rankWeight, setRankWeight] = useState<string>("");
  const [rankReps, setRankReps] = useState<string>("");
  const [rankCustomOpen, setRankCustomOpen] = useState(false);
  const [rankCustomName, setRankCustomName] = useState("");
  const [rankRevealPhase, setRankRevealPhase] = useState<0 | 1 | 2 | 3>(0);
  const [rankResult, setRankResult] = useState<{
    rankLabel: string; // e.g. "Master II"
    rankSlug: RankSlug;
    tier: "I" | "II" | "III";
    topPercentileLabel: string; // e.g. "Top 9.6%"
    nextRankLabel: string | null;
    weightIncreaseLabel: string | null;
    exercise: string;
    weightDisplay: string;
    reps: number;
    estimated1RMDisplay: string;
  } | null>(null);

  const resetStrengthRankDemo = useCallback(() => {
    setRankSubStep(0);
    setRankCategory(null);
    setRankExercise(null);
    setRankWeight("");
    setRankReps("");
    setRankCustomOpen(false);
    setRankCustomName("");
    setRankRevealPhase(0);
    setRankResult(null);
    setLogWorkoutPressed(false);
    setLogWorkoutLoading(false);
  }, []);

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
    (step === 4 && data.country !== "") ||
    (step === 5 &&
      ((rankSubStep === 0 && rankCategory !== null) ||
        (rankSubStep === 1 &&
          !!rankExercise &&
          Number(rankWeight) > 0 &&
          Math.floor(Number(rankReps)) > 0) ||
        rankSubStep === 3));

  const isStrengthRankStep = step === 5;
  const isStrengthReveal = isStrengthRankStep && (rankSubStep === 2 || rankSubStep === 3);
  const strengthPrimaryButtonDisabled =
    submitting ||
    logWorkoutLoading ||
    (isStrengthRankStep
      ? rankSubStep === 0
        ? rankCategory === null
        : rankSubStep === 1
          ? !rankExercise || !(Number(rankWeight) > 0) || !(Math.floor(Number(rankReps)) > 0)
          : rankSubStep === 2
            ? true
            : false
      : false);

  const exercisesForCategory: Record<StrengthCategory, string[]> = {
    chest: ["Bench Press", "Incline Bench"],
    back: ["Deadlift", "Barbell Row"],
    shoulders: ["Overhead Press", "Lateral Raise"],
    arms: ["Bicep Curl", "Tricep Pushdown"],
    legs: ["Squat", "Leg Press"],
  };

  const POPULAR_COUNTRIES: string[] = ["US", "GB", "CA", "AU", "DE"];
  const popularCountries = COUNTRIES.filter((c) => POPULAR_COUNTRIES.includes(c.code));
  const filteredCountries = countrySearch.trim()
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(countrySearch.trim().toLowerCase())
      )
    : COUNTRIES;

  const handleHeaderBack = () => {
    haptic();
    setError(null);

    // Lock the user on the final strength result screen.
    if (step === 5 && rankSubStep === 3) return;

    if (step === 0) {
      router.back();
      return;
    }

    if (step === 5) {
      if (rankSubStep === 3) {
        // From reveal -> back to logging
        setRankSubStep(1);
        setRankCustomOpen(false);
        setRankCustomName("");
        return;
      }
      if (rankSubStep === 2) {
        // From calculating -> back to logging
        setRankSubStep(1);
        setRankCustomOpen(false);
        setRankCustomName("");
        return;
      }
      if (rankSubStep === 1) {
        // Back to category selection
        setRankSubStep(0);
        setRankCustomOpen(false);
        setRankCustomName("");
        return;
      }
    }

    setStep((s) => Math.max(0, s - 1));
  };

  useEffect(() => {
    if (!isStrengthRankStep || rankSubStep !== 2) return;
    setRankRevealPhase(0);
    const t1 = setTimeout(() => setRankRevealPhase(1), 700);
    const t2 = setTimeout(() => setRankRevealPhase(2), 1400);
    const t3 = setTimeout(() => setRankRevealPhase(3), 2100);
    const t4 = setTimeout(() => setRankSubStep(3), 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isStrengthRankStep, rankSubStep]);

  const handleBack = () => {
    haptic();
    setStep((s) => Math.max(0, s - 1));
    setError(null);
  };

  // Only show Skip on the "Log your first workout" entry point, not within the lift logging form.
  const showSkip = step === 5 && rankSubStep === 0;
  const handleSkip = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const result = await completeOnboarding({
        name: data.firstName.trim() || null,
        birthday: data.birthday,
        height: data.heightCm,
        weight: data.weightKg,
        units: data.units,
        gender: data.gender,
        country: data.country || null,
        logDate: localCalendarDateYYYYMMDD(),
      });
      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      haptic();
      window.location.assign(appHref("/dev/paywall"));
    } catch {
      setSubmitting(false);
    }
  };

  const handleContinue = async () => {
    if (step === 0) {
      haptic();
      setStep(1);
      setError(null);
      return;
    }
    if (step < TOTAL_STEPS) {
      haptic();
      setStep((s) => s + 1);
      setError(null);
      return;
    }

    // Final step: strength rank flow must finish before completing onboarding.
    if (step === TOTAL_STEPS && rankSubStep !== 3) return;

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
        logDate: localCalendarDateYYYYMMDD(),
      });
      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      haptic();
      window.location.assign(appHref("/dev/paywall"));
    } catch {
      setError("Something went wrong.");
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isStrengthRankStep || rankSubStep !== 1) {
      setLogWorkoutPressed(false);
      setLogWorkoutLoading(false);
    }
  }, [isStrengthRankStep, rankSubStep]);

  const progress = step === 0 ? 0 : (step / TOTAL_STEPS) * 100;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="bg-zinc-950 pt-[env(safe-area-inset-top,0px)]">
        {/* Header */}
        <header
          className="relative mx-auto flex h-14 w-full max-w-3xl items-center justify-center border-b border-white/[0.05] bg-zinc-950 px-4"
          role="banner"
        >
          {step === 0 || (step === 5 && rankSubStep === 3) ? null : (
            <button
              type="button"
              onClick={handleHeaderBack}
              className="tap-feedback absolute left-4 z-10 rounded-lg px-2 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
              aria-label="Back"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="pointer-events-none whitespace-nowrap px-12 text-center text-[18px] font-bold leading-none tracking-tight text-zinc-100 sm:text-[22px]">
            Complete Your Profile
          </h1>
        </header>

        {/* Progress bar — a bit tighter on step 5 to free vertical space on small phones */}
        <div className={`h-1 w-full bg-zinc-800 ${step === 5 ? "mt-1.5 mb-2" : "mt-2 mb-4"}`}>
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Welcome screen (step 0) */}
      {isWelcome ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-4">
            {/* Logo */}
            <p className="mb-6 text-2xl font-semibold tracking-wide text-amber-500">
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
            <div className="mt-6 max-w-sm space-y-3 text-center text-zinc-400">
              <p>
                Track your workouts, see your progress, and unlock powerful training insights.
              </p>
              <p>
                Before you begin, we&apos;ll ask a few quick questions to personalize your experience and make sure your data is as accurate as possible.
              </p>
              <p>It takes less than a minute.</p>
            </div>
          </div>
          {/* Bottom action bar */}
          <div
            className="relative mt-auto w-full border-t border-zinc-800 bg-zinc-950 p-5"
            style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
          >
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
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {step !== 4 && step !== 5 ? (
              <div className="px-4 pt-4">
                <div className="mb-3">
                  <h1 className="text-center text-lg font-semibold text-zinc-100 sm:text-xl">
                    {STEP_TITLES[formStep]}
                  </h1>
                </div>
              </div>
            ) : null}

            {/* Step content */}
            {step === 1 && (
              <div className="min-h-0 flex-1 space-y-3 px-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-zinc-400">First name</span>
                  <input
                    type="text"
                    value={data.firstName}
                    onChange={(e) => setData((prev) => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Your first name"
                    className="w-full rounded-xl border-2 border-zinc-700 bg-zinc-800/80 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
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
                      { value: "male" as const, label: "Male", Icon: MaleIcon },
                      { value: "female" as const, label: "Female", Icon: FemaleIcon },
                      { value: "prefer_not_to_say" as const, label: "Prefer not to say", Icon: PreferNotToSayIcon },
                    ].map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          haptic();
                          setData((prev) => ({ ...prev, gender: value }));
                        }}
                        className={`tap-feedback flex flex-col items-center gap-0.5 rounded-xl border-2 px-2 py-2 text-center transition-colors ${
                          data.gender === value
                            ? "border-amber-500 bg-amber-500/20 text-amber-400"
                            : "border-zinc-700 bg-zinc-800/80 text-zinc-400 hover:border-zinc-600"
                        }`}
                      >
                        <Icon
                          size={32}
                          aria-hidden
                          className={
                            data.gender === value
                              ? "shrink-0 text-amber-400"
                              : "shrink-0 text-zinc-300"
                          }
                        />
                        <span className="text-xs font-medium leading-tight">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
                <div className="grid w-full max-w-md grid-cols-2 gap-3">
                  {(["metric", "imperial"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => {
                        haptic();
                        setData((prev) => ({ ...prev, units: u }));
                      }}
                      className={`tap-feedback rounded-2xl border-2 px-4 py-4 text-base font-medium transition-colors ${
                        data.units === u
                          ? "border-amber-500 bg-amber-500/20 text-amber-400"
                          : "border-zinc-700 bg-zinc-800/80 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      {u === "metric" ? "Metric" : "Imperial"}
                    </button>
                  ))}
                </div>
                <div className="mt-4 scale-[0.78] origin-top sm:scale-100 sm:mt-6">
                  <UnitsKettlebellVisual unit={data.units} />
                </div>
              </div>
            )}

            {step === 3 && (
          <div className="flex flex-1 items-center justify-center">
          <div className="flex justify-center gap-10">
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
          </div>
        )}

            {step === 4 && (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-2">
            <div className="mt-6 mb-5 text-center">
              <h2 className="text-xl font-semibold text-zinc-100 sm:text-2xl">
                Where are you from?
              </h2>
            </div>

            <div className="mb-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-400 text-center">
                  Search country
                </span>
                <input
                  type="search"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search country..."
                  className="h-12 w-full rounded-xl border-2 border-zinc-700 bg-zinc-800/80 px-3.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950/40">
              {countrySearch.trim() === "" ? (
                <div className="p-3">
                  <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Popular
                  </p>
                  <div className="space-y-1">
                    {popularCountries.map((c) => {
                      const selected = data.country === c.code;
                      return (
                        <button
                          key={`popular-${c.code}`}
                          type="button"
                          onClick={() => {
                            haptic();
                            setData((prev) => ({ ...prev, country: c.code }));
                          }}
                          className={[
                            "tap-feedback flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors",
                            selected
                              ? "bg-amber-500/20 text-amber-300"
                              : "text-zinc-200 hover:bg-zinc-900/60",
                          ].join(" ")}
                        >
                          <span className="flex items-center gap-2">
                            <FlagIcon code={c.code} />
                            <span className="font-medium">{c.name}</span>
                          </span>
                          {selected ? (
                            <span className="text-xs font-semibold text-amber-300">Selected</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      All Countries
                    </p>
                    <div className="space-y-1">
                      {filteredCountries.map((c) => {
                        const selected = data.country === c.code;
                        return (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              haptic();
                              setData((prev) => ({ ...prev, country: c.code }));
                            }}
                            className={[
                              "tap-feedback flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors",
                              selected
                                ? "bg-amber-500/20 text-amber-300"
                                : "text-zinc-200 hover:bg-zinc-900/60",
                            ].join(" ")}
                          >
                            <span className="flex items-center gap-2">
                              <FlagIcon code={c.code} />
                              <span className="font-medium">{c.name}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3">
                  <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Results
                  </p>
                  <div className="space-y-1">
                    {filteredCountries.map((c) => {
                      const selected = data.country === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            haptic();
                            setData((prev) => ({ ...prev, country: c.code }));
                          }}
                          className={[
                            "tap-feedback flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors",
                            selected
                              ? "bg-amber-500/20 text-amber-300"
                              : "text-zinc-200 hover:bg-zinc-900/60",
                          ].join(" ")}
                        >
                          <span className="flex items-center gap-2">
                            <FlagIcon code={c.code} />
                            <span className="font-medium">{c.name}</span>
                          </span>
                          {selected ? (
                            <span className="text-xs font-semibold text-amber-300">Selected</span>
                          ) : null}
                        </button>
                      );
                    })}
                    {filteredCountries.length === 0 ? (
                      <p className="px-3 py-6 text-center text-sm text-zinc-500">
                        No countries match.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

            {step === 5 && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {rankSubStep === 3 ? null : (
                  <div className="shrink-0 px-5 pb-2 pt-3">
                    <h2 className="text-xl font-semibold text-zinc-100 sm:text-2xl">
                      Log your first workout
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      Log one lift and we&apos;ll calculate your strength level.
                    </p>
                  </div>
                )}

                {rankSubStep === 0 && (
                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-5 pb-1">
                    <div className="mx-auto w-full max-w-md space-y-1.5 py-1">
                      {(
                        [
                          { key: "chest" as const, title: "Chest", subtitle: "Bench Press · Incline Bench" },
                          { key: "back" as const, title: "Back", subtitle: "Deadlift · Barbell Row" },
                          { key: "shoulders" as const, title: "Shoulders", subtitle: "Overhead Press · Lateral Raise" },
                          { key: "arms" as const, title: "Arms", subtitle: "Bicep Curl · Tricep Pushdown" },
                          { key: "legs" as const, title: "Legs", subtitle: "Squat · Leg Press" },
                        ] as const
                      ).map((c) => {
                        const selected = rankCategory === c.key;
                        return (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => {
                              haptic();
                              setRankCategory(c.key);
                              setRankExercise(null);
                                  setRankCustomOpen(false);
                                  setRankCustomName("");
                            }}
                            className={[
                              "tap-feedback flex w-full min-h-[4rem] flex-col justify-center rounded-[14px] px-4 py-3 text-left transition-colors",
                              selected
                                ? "border-2 border-[#F5A623] bg-[rgba(245,166,35,0.08)]"
                                : "border border-white/[0.08] bg-zinc-900/40 hover:border-white/[0.12]",
                            ].join(" ")}
                          >
                            <p className="text-base font-semibold text-zinc-100">{c.title}</p>
                            <p
                              className="mt-1 text-[12px] leading-[1.3] text-zinc-400/70"
                              style={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {c.subtitle}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {rankSubStep === 1 && (
                  <StrengthRankLogLiftStep
                    rankCategory={rankCategory}
                    exercisesForCategory={exercisesForCategory}
                    rankExercise={rankExercise}
                    setRankExercise={setRankExercise}
                    rankCustomOpen={rankCustomOpen}
                    setRankCustomOpen={setRankCustomOpen}
                    rankCustomName={rankCustomName}
                    setRankCustomName={setRankCustomName}
                    rankWeight={rankWeight}
                    setRankWeight={setRankWeight}
                    rankReps={rankReps}
                    setRankReps={setRankReps}
                    units={data.units}
                  />
                )}

                {isStrengthReveal && (
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
                    {rankSubStep === 2 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-zinc-300">
                          {rankRevealPhase === 0
                            ? "Logging your first workout..."
                            : rankRevealPhase === 1
                              ? "Calculating your strength..."
                              : rankRevealPhase === 2
                                ? "Comparing with lifters at your bodyweight..."
                                : "Finding your rank..."}
                        </p>
                        <div className="mx-auto mt-4 h-2 w-48 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all duration-700"
                            style={{
                              width: `${rankRevealPhase === 0 ? 25 : rankRevealPhase === 1 ? 50 : rankRevealPhase === 2 ? 75 : 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full max-w-sm">
                        <p className="text-xl font-semibold text-zinc-100">
                          {(rankCategory ? `${strengthCategoryToLabel(rankCategory)} Rank Unlocked` : "Rank Unlocked")}
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">
                          {rankCategory ? `Your ${strengthCategoryToLabel(rankCategory)} Rank` : "Your Rank"}
                        </p>
                        <div
                          className="mx-auto"
                          style={{
                            transform: "scale(1.25)",
                            filter: "drop-shadow(0 0 20px rgba(80,160,255,0.5))",
                          }}
                        >
                          <RankBadge
                            rank={(rankResult?.rankSlug ?? "newbie") as RankSlug}
                            tier={rankResult?.tier ?? "I"}
                            size={96}
                            showTierLabel={false}
                          />
                        </div>
                        <p className="mt-4 text-2xl font-bold text-zinc-100">{rankResult?.rankLabel ?? "—"}</p>
                        <p className="mt-1 text-sm text-zinc-400">
                          {(rankResult?.topPercentileLabel ?? "Top —%") + " of lifters"}
                        </p>
                        <p className="mt-3 text-xs font-medium text-zinc-400">
                          Strength relative to your bodyweight
                        </p>

                        {rankResult?.nextRankLabel ? (
                          <div className="mt-4 text-sm text-zinc-300">
                            <p>
                              <span className="text-zinc-500">Next rank:</span>{" "}
                              <span className="font-semibold text-zinc-100">{rankResult.nextRankLabel}</span>
                            </p>
                            {rankResult.weightIncreaseLabel ? (
                              <p className="mt-1 text-zinc-400">{rankResult.weightIncreaseLabel}</p>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-left">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Based on your first workout
                          </p>
                          <p className="mt-1 font-semibold text-zinc-100">{rankResult?.exercise ?? "—"}</p>
                          <p className="mt-1 text-sm text-zinc-400">
                            {(rankResult?.weightDisplay ?? "—") + " × " + String(rankResult?.reps ?? "—") + " reps"}
                          </p>
                          <p className="mt-2 text-sm text-zinc-400">
                            Estimated 1RM:{" "}
                            <span className="font-semibold text-zinc-200">
                              {rankResult?.estimated1RMDisplay ?? "—"}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom action bar (form steps) */}
          <div
            className={[
              "mt-auto w-full shrink-0 border-t border-zinc-800 px-5",
              isStrengthRankStep ? "pt-3" : "pt-4",
              isStrengthRankStep && rankSubStep === 1
                ? "relative bg-zinc-950 pb-3"
                : "relative bg-zinc-950 pb-5",
            ].join(" ")}
            style={{
              paddingBottom:
                isStrengthRankStep && rankSubStep === 0
                  ? "calc(14px + env(safe-area-inset-bottom))"
                  : isStrengthRankStep && rankSubStep === 1
                    ? "calc(12px + env(safe-area-inset-bottom))"
                    : "calc(20px + env(safe-area-inset-bottom))",
            }}
          >
            {error ? (
              <p className="mb-3 text-center text-sm text-red-400">{error}</p>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                if (!isStrengthRankStep) {
                  await handleContinue();
                  return;
                }

                if (rankSubStep === 0) {
                  if (!rankCategory) return;
                  haptic();
                  setRankSubStep(1);
                  return;
                }
                if (rankSubStep === 1) {
                  const w = Number(rankWeight);
                  const r = Math.floor(Number(rankReps));
                  if (!rankExercise || !Number.isFinite(w) || w <= 0 || !Number.isFinite(r) || r <= 0) return;

                  // Immediate press feedback, then show loading state.
                  setLogWorkoutPressed(true);
                  await new Promise((res) => setTimeout(res, 120));
                  setLogWorkoutLoading(true);

                  const weightKg = data.units === "imperial" ? lbsToKg(w) : w;
                  const bodyweightKg = Math.max(1, data.weightKg);
                  const oneRmKg = epleyEstimated1RM(weightKg, r);
                  const ratio = oneRmKg / bodyweightKg;
                  const muscle = strengthCategoryToMuscle(rankCategory ?? "chest");
                  const info = strengthScoreToRank(ratio, muscle);

                  setRankResult({
                    rankLabel: info.rankLabel,
                    rankSlug: info.rankSlug as RankSlug,
                    tier: info.tier,
                    topPercentileLabel: info.topPercentileLabel,
                    nextRankLabel: info.nextRankLabel,
                    weightIncreaseLabel: (() => {
                      if (!info.nextThreshold) return null;
                      const required1RM = info.nextThreshold * bodyweightKg;
                      const requiredWeightKg = required1RM / (1 + r / 30);
                      const addKg = requiredWeightKg - weightKg;
                      if (!Number.isFinite(addKg) || addKg <= 0) return null;
                      const addRoundedKg = Math.max(0.5, Math.round(addKg * 2) / 2);
                      const display = data.units === "imperial" ? Math.round(kgToLbs(addRoundedKg)) : addRoundedKg;
                      const unit = data.units === "imperial" ? "lb" : "kg";
                      return `+${display} ${unit} ${rankExercise.toLowerCase()} needed`;
                    })(),
                    exercise: rankExercise,
                    weightDisplay: `${Math.round((data.units === "imperial" ? w : weightKg) * 10) / 10} ${data.units === "imperial" ? "lb" : "kg"}`,
                    reps: r,
                    estimated1RMDisplay: `${Math.round((data.units === "imperial" ? kgToLbs(oneRmKg) : oneRmKg) * 10) / 10} ${data.units === "imperial" ? "lb" : "kg"}`,
                  });

                  haptic();
                  setRankSubStep(2);
                  return;
                }
                if (rankSubStep === 3) {
                  // Keep the user on the result screen while we save + navigate.
                  await handleContinue();
                }
              }}
              disabled={isStrengthRankStep ? strengthPrimaryButtonDisabled : !canContinue || submitting}
              className={[
                "tap-feedback w-full rounded-[14px] bg-amber-500 text-base font-semibold text-zinc-950 transition disabled:opacity-50 disabled:shadow-none hover:bg-amber-400 active:scale-[0.97] active:brightness-95",
                logWorkoutPressed || logWorkoutLoading ? "shadow-none brightness-95" : "shadow-lg shadow-amber-500/20",
                isStrengthRankStep && rankSubStep === 0 ? "h-12" : isStrengthRankStep && rankSubStep === 1 ? "h-12" : "h-14",
              ].join(" ")}
            >
              {isStrengthRankStep && (rankSubStep === 2 || logWorkoutLoading || submitting) ? (
                <span className="mr-2 inline-flex align-middle" aria-hidden>
                  <svg className="h-5 w-5 animate-spin text-zinc-950" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                </span>
              ) : null}
              {submitting
                ? isStrengthRankStep && rankSubStep === 3
                  ? "Starting…"
                  : "Saving…"
                : isStrengthRankStep
                  ? rankSubStep === 0
                    ? "Continue"
                    : rankSubStep === 1
                      ? logWorkoutLoading
                        ? "Calculating..."
                        : "Log Workout"
                      : rankSubStep === 2
                        ? "Calculating…"
                        : "Start Training"
                  : step === TOTAL_STEPS
                    ? "Finish"
                    : "Continue"}
            </button>
            {showSkip ? (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="tap-feedback text-xs font-medium text-zinc-400/70 hover:text-zinc-300"
                >
                  Skip
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

// CountryStep removed (inlined in step 4 for exact layout control).

function StrengthRankLogLiftStep(props: {
  rankCategory: StrengthCategory | null;
  exercisesForCategory: Record<StrengthCategory, string[]>;
  rankExercise: string | null;
  setRankExercise: (v: string | null) => void;
  rankCustomOpen: boolean;
  setRankCustomOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  rankCustomName: string;
  setRankCustomName: (v: string) => void;
  rankWeight: string;
  setRankWeight: (v: string) => void;
  rankReps: string;
  setRankReps: (v: string) => void;
  units: "metric" | "imperial";
}) {
  const [isTallScreen, setIsTallScreen] = useState(false);

  useEffect(() => {
    const check = () => setIsTallScreen(window.innerHeight > 750);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const list = props.rankCategory ? props.exercisesForCategory[props.rankCategory] : [];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-2">
      <div className="pt-2">
        <p className="mb-2 text-sm font-semibold text-zinc-400">Choose your first lift</p>
        <div className="space-y-1.5">
          {list.map((ex) => {
            const selected = props.rankExercise === ex;
            return (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  haptic();
                  props.setRankExercise(ex);
                  props.setRankCustomOpen(false);
                  props.setRankCustomName("");
                }}
                className={[
                  "tap-feedback flex h-11 w-full items-center rounded-[12px] px-3 py-2 text-left transition-colors",
                  selected
                    ? "border-2 border-[#F5A623] bg-[rgba(245,166,35,0.08)] text-amber-200"
                    : "border border-white/[0.08] bg-zinc-900/40 text-zinc-200 hover:border-white/[0.12]",
                ].join(" ")}
              >
                <span className="text-sm font-semibold leading-none">{ex}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              haptic();
              props.setRankCustomOpen((v) => !v);
              props.setRankCustomName("");
              props.setRankExercise(null);
            }}
            className={[
              "tap-feedback flex h-11 w-full items-center rounded-[12px] px-3 py-2 text-left transition-colors",
              props.rankCustomOpen
                ? "border-2 border-[#F5A623] bg-[rgba(245,166,35,0.08)] text-amber-200"
                : "border border-white/[0.08] bg-zinc-900/40 text-zinc-200 hover:border-white/[0.12]",
            ].join(" ")}
          >
            <span className="text-sm font-semibold">+ Add your exercise</span>
          </button>

          <div
            className="overflow-hidden"
            style={{
              maxHeight: props.rankCustomOpen ? "120px" : "0px",
              opacity: props.rankCustomOpen ? 1 : 0,
              transition: "max-height 0.25s ease, opacity 0.25s ease",
            }}
            aria-hidden={!props.rankCustomOpen}
          >
            <div className="rounded-[12px] border border-white/[0.08] bg-zinc-900/30 p-2.5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-400">
                  Custom Exercise Name
                </span>
                <input
                  type="text"
                  value={props.rankCustomName}
                  onChange={(e) => {
                    const v = e.target.value;
                    props.setRankCustomName(v);
                    props.setRankExercise(v.trim() ? v.trim() : null);
                  }}
                  placeholder="Type your own exercise name"
                  className="h-10 w-full rounded-[10px] border-2 border-zinc-700 bg-zinc-800/80 px-3.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  autoComplete="off"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2.5">
        <p className="mb-2 text-sm font-semibold text-zinc-400">Enter Lift</p>
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-400">
              Weight lifted ({props.units === "imperial" ? "lb" : "kg"})
            </span>
            <input
              inputMode="decimal"
              type="number"
              value={props.rankWeight}
              onChange={(e) => props.setRankWeight(e.target.value)}
              placeholder={props.units === "imperial" ? "lb" : "kg"}
              className="h-10 w-full rounded-[10px] border-2 border-zinc-700 bg-zinc-800/80 px-3.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Your rank is calculated relative to your bodyweight.
            </p>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-400">Reps</span>
            <input
              inputMode="numeric"
              type="number"
              value={props.rankReps}
              onChange={(e) => props.setRankReps(e.target.value)}
              placeholder="e.g. 5"
              className="h-10 w-full rounded-[10px] border-2 border-zinc-700 bg-zinc-800/80 px-3.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </label>
        </div>
      </div>

      {isTallScreen ? (
        <p className="mt-4 text-center text-xs text-zinc-500">
          We’ll estimate your 1RM using the Epley formula.
        </p>
      ) : null}
    </div>
  );
}
