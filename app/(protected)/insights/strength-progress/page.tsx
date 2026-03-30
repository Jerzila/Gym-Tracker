import { getStrengthRankingAtDate } from "@/app/actions/strengthRanking";
import { getProfile } from "@/app/actions/profile";
import { StaticStrengthDiagram } from "@/app/components/StaticStrengthDiagram";
import { getStepsForMuscle, type StrengthRankMuscle } from "@/lib/strengthRanking";
import { RANK_COLORS, RANK_LEGEND_ENTRIES } from "@/lib/rankBadges";

function fmt(d: string) {
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

function clampISODate(s: unknown): string | null {
  const v = typeof s === "string" ? s.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

function strengthStepIndex(muscle: StrengthRankMuscle, rank: string, tier: "I" | "II" | "III"): number {
  const steps = getStepsForMuscle(muscle);
  const idx = steps.findIndex((s) => s.baseRank === rank && s.tier === tier);
  return idx >= 0 ? idx : steps.length - 1;
}

function genderFromProfile(profile: Awaited<ReturnType<typeof getProfile>>): "male" | "female" {
  return profile?.gender === "female" ? "female" : "male";
}

type MuscleDelta = {
  muscle: StrengthRankMuscle;
  /** positive = improved, 0 unchanged, negative decreased */
  deltaLevels: number;
};

function computeMuscleDeltas(args: {
  startData: NonNullable<Awaited<ReturnType<typeof getStrengthRankingAtDate>>["data"]>;
  endData: NonNullable<Awaited<ReturnType<typeof getStrengthRankingAtDate>>["data"]>;
}): MuscleDelta[] {
  const muscles: StrengthRankMuscle[] = ["chest", "back", "shoulders", "biceps", "triceps", "legs"];
  return muscles.map((m) => {
    const a = args.startData.muscleRanks[m];
    const b = args.endData.muscleRanks[m];
    const ia = strengthStepIndex(m, a.rank, a.tier);
    const ib = strengthStepIndex(m, b.rank, b.tier);
    return { muscle: m, deltaLevels: ia - ib };
  });
}

export default async function StrengthProgressPage({
  searchParams,
}: {
  searchParams?: Promise<{ start?: string; end?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const start = clampISODate(sp.start) ?? "2000-01-01";
  const end = clampISODate(sp.end) ?? new Date().toISOString().slice(0, 10);

  const [profile, startRes, endRes] = await Promise.all([
    getProfile().catch(() => null),
    getStrengthRankingAtDate(start),
    getStrengthRankingAtDate(end),
  ]);

  const startData = startRes.data;
  const endData = endRes.data;
  const gender = genderFromProfile(profile);

  return (
    <main className="mx-auto max-w-xl px-3 py-4 sm:px-4 sm:py-8">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-zinc-100">Your Strength Progress</h1>
        <p className="text-xs text-zinc-500">
          {fmt(start)} → {fmt(end)}
        </p>
      </div>

      {!startData || !endData ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-4 text-sm text-zinc-400">
          Unable to load strength progress right now.
        </p>
      ) : (
        <StrengthProgressContent
          startData={startData}
          endData={endData}
          gender={gender}
          startDateLabel={fmt(start)}
          endDateLabel={fmt(end)}
        />
      )}
    </main>
  );
}

function StrengthProgressContent({
  startData,
  endData,
  gender,
  startDateLabel,
  endDateLabel,
}: {
  startData: NonNullable<Awaited<ReturnType<typeof getStrengthRankingAtDate>>["data"]>;
  endData: NonNullable<Awaited<ReturnType<typeof getStrengthRankingAtDate>>["data"]>;
  gender: "male" | "female";
  startDateLabel: string;
  endDateLabel: string;
}) {
  const deltas = computeMuscleDeltas({ startData, endData });
  const improved = deltas.filter((d) => d.deltaLevels > 0);
  const improvedMuscles = improved.map((d) => d.muscle);

  return (
    <div className="flex flex-col gap-8">
      <ComparisonRow
        title="Front"
        side="front"
        startData={startData}
        endData={endData}
        gender={gender}
        highlightMuscles={improvedMuscles}
        startDateLabel={startDateLabel}
        endDateLabel={endDateLabel}
      />
      <MuscleStrengthRankKey />
      <ComparisonRow
        title="Back"
        side="back"
        startData={startData}
        endData={endData}
        gender={gender}
        highlightMuscles={improvedMuscles}
        startDateLabel={startDateLabel}
        endDateLabel={endDateLabel}
      />
    </div>
  );
}

/** ~12% larger than previous 0.7 */
const COMPARE_DIAGRAM_SCALE = 0.78;

function ComparisonRow({
  title,
  side,
  gender,
  startData,
  endData,
  highlightMuscles,
  startDateLabel,
  endDateLabel,
}: {
  title: string;
  side: "front" | "back";
  gender: "male" | "female";
  startData: NonNullable<Awaited<ReturnType<typeof getStrengthRankingAtDate>>["data"]>;
  endData: NonNullable<Awaited<ReturnType<typeof getStrengthRankingAtDate>>["data"]>;
  highlightMuscles: StrengthRankMuscle[];
  startDateLabel: string;
  endDateLabel: string;
}) {
  const dateLabelClass =
    "text-center text-[10px] font-medium leading-tight text-zinc-500 [overflow-wrap:anywhere]";

  return (
    <section className="mx-auto w-full max-w-md">
      <h2 className="text-sm font-semibold tracking-tight text-zinc-100">{title}</h2>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-3 gap-y-2">
        <p className={dateLabelClass}>{startDateLabel}</p>
        <span className="text-center text-[10px] font-semibold text-zinc-400" aria-hidden>
          →
        </span>
        <p className={dateLabelClass}>{endDateLabel}</p>

        <div className="flex items-center justify-center">
          <StaticStrengthDiagram
            data={startData}
            side={side}
            gender={gender}
            scale={COMPARE_DIAGRAM_SCALE}
          />
        </div>
        <div aria-hidden className="min-w-[1.25rem]" />
        <div className="flex items-center justify-center">
          <StaticStrengthDiagram
            data={endData}
            side={side}
            gender={gender}
            scale={COMPARE_DIAGRAM_SCALE}
            highlightMuscles={highlightMuscles}
          />
        </div>
      </div>
    </section>
  );
}

/** Same rank key as Insights → Muscle Strength (`DashboardStrengthDiagram`), inline between Front and Back. */
function MuscleStrengthRankKey() {
  return (
    <aside className="mx-auto w-full max-w-md px-0.5" aria-label="Rank color key">
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-zinc-500">
        {RANK_LEGEND_ENTRIES.map(({ rank, label }) => (
          <span key={rank} className="flex items-center gap-1">
            <span
              className="h-2 w-2 shrink-0 rounded"
              style={{ backgroundColor: RANK_COLORS[rank] }}
              aria-hidden
            />
            {label}
          </span>
        ))}
      </div>
    </aside>
  );
}

