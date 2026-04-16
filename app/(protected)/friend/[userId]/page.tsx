import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/app/components/AppHeader";
import { BackArrowButton } from "@/app/components/BackArrowButton";
import { FriendProfileStrengthMap } from "@/app/components/FriendProfileStrengthMap";
import { ProfileFriendActions } from "@/app/components/ProfileFriendActions";
import { RankBadge } from "@/app/components/RankBadge";
import { getProfilePageDataForViewer } from "@/app/actions/social";
import { formatFriendCategoryLiftSummary } from "@/lib/friendProfileCategoryTopLifts";
import { formatWeight, weightUnitLabel } from "@/lib/formatWeight";
import { tierFromStoredOverallRank } from "@/lib/tierFromStoredOverallRank";

type Props = { params: Promise<{ userId: string }> };

function formatVolumeKg(kg: number): string {
  return Math.round(kg).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold tracking-tight text-zinc-200">{children}</h2>;
}

function StatCard({
  label,
  value,
  compact,
}: {
  label: string;
  value: React.ReactNode;
  /** Narrow row of three (e.g. Body) — smaller type and padding so all stay on one line */
  compact?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/50 ${
        compact ? "px-2 py-3 sm:px-3 sm:py-3.5" : "p-4"
      }`}
    >
      <p
        className={`font-medium uppercase tracking-wider text-zinc-500 ${
          compact ? "text-[10px] sm:text-[11px]" : "text-[11px]"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 font-semibold tabular-nums leading-snug text-zinc-100 ${
          compact ? "text-sm sm:text-base" : "text-lg"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatHeightForDisplay(heightCm: number, units: "metric" | "imperial"): string {
  if (units === "imperial") {
    const inches = heightCm / 2.54;
    return `${Math.round(inches * 10) / 10} in`;
  }
  return `${Math.round(heightCm * 10) / 10} cm`;
}

export default async function FriendProfilePage({ params }: Props) {
  const { userId } = await params;
  const rawId = decodeURIComponent(String(userId ?? "").trim());

  const { data, error } = await getProfilePageDataForViewer(rawId);

  if (error === "Not authenticated") {
    const back = `/friend/${encodeURIComponent(rawId)}`;
    redirect(`/login?redirect=${encodeURIComponent(back)}`);
  }
  if (error === "self") {
    redirect("/account/edit-profile");
  }
  if (error || !data) {
    notFound();
  }

  const compareHref = `/insights/strength-compare?with=${encodeURIComponent(data.subjectUserId)}`;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-950 text-zinc-100">
      <div className="fixed inset-x-0 top-0 z-[210] bg-zinc-950 pt-[env(safe-area-inset-top,0px)]">
        <AppHeader title={data.username} leftSlot={<BackArrowButton />} />
      </div>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-[max(7rem,env(safe-area-inset-bottom,0px))] pt-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:px-6">
        <div className="pt-4">
          <div className="card-tap flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <RankBadge
              rank={data.rank_badge}
              tier={tierFromStoredOverallRank(data.overall_rank)}
              size={80}
            />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold tracking-tight text-zinc-100">{data.overall_rank}</p>
              <p className="mt-0.5 text-xs text-zinc-400">{data.top_percentile_display}</p>
            </div>
          </div>

          <ProfileFriendActions subjectUserId={data.subjectUserId} initialRelationship={data.relationship} />

          {data.hasFriendDetailStats ? (
            <section className="mt-6" aria-labelledby="friend-body-heading">
              <SectionTitle>
                <span id="friend-body-heading">Body</span>
              </SectionTitle>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
                <StatCard
                  compact
                  label="Weight"
                  value={
                    data.bodyWeightKg != null ? (
                      <>
                        {formatWeight(data.bodyWeightKg, { units: data.displayUnits })}{" "}
                        {weightUnitLabel(data.displayUnits)}
                      </>
                    ) : (
                      <span className="text-zinc-500">Not set</span>
                    )
                  }
                />
                <StatCard
                  compact
                  label="Height"
                  value={
                    data.heightCm != null ? (
                      formatHeightForDisplay(data.heightCm, data.displayUnits)
                    ) : (
                      <span className="text-zinc-500">Not set</span>
                    )
                  }
                />
                <StatCard
                  compact
                  label="BMI"
                  value={
                    data.bmi != null && data.bmiCategory ? (
                      <span className="flex flex-col gap-0.5">
                        <span>{data.bmi}</span>
                        <span className="text-xs font-medium normal-case" style={{ color: data.bmiCategory.color }}>
                          {data.bmiCategory.label}
                        </span>
                      </span>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )
                  }
                />
              </div>
            </section>
          ) : null}

          {data.hasFriendDetailStats ? (
            <section className="mt-6" aria-labelledby="friend-strength-map-heading">
              <SectionTitle>
                <span id="friend-strength-map-heading">Strength Map</span>
              </SectionTitle>
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 sm:p-4">
                <FriendProfileStrengthMap data={data.strengthRankingView} gender={data.gender} />
              </div>
            </section>
          ) : (
            <p className="mt-6 text-sm leading-relaxed text-zinc-500">
              Add this person as a friend to see their strength map, activity, and full stats.
            </p>
          )}

          <section className="mt-6" aria-labelledby="friend-stats-grid-heading">
            <SectionTitle>
              <span id="friend-stats-grid-heading">Stats</span>
            </SectionTitle>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatCard
                label="Total Workouts"
                value={
                  data.hasFriendDetailStats ? (
                    data.workoutCount.toLocaleString("en-US")
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )
                }
              />
              <StatCard label="Total PRs" value={data.prCount.toLocaleString("en-US")} />
              <StatCard label="Total Volume" value={<>{formatVolumeKg(data.totalVolumeKg)} kg</>} />
              <StatCard label="Best Rank" value={data.overall_rank} />
            </div>
          </section>

          {data.hasFriendDetailStats && data.bestExerciseByLoad ? (
            <section className="mt-6" aria-labelledby="friend-best-exercise-heading">
              <SectionTitle>
                <span id="friend-best-exercise-heading">Best exercise</span>
              </SectionTitle>
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-base font-semibold text-zinc-100">{data.bestExerciseByLoad.exerciseName}</p>
                <p className="mt-2 text-sm text-zinc-400">
                  Heaviest weight in{" "}
                  <span className="font-medium text-zinc-300">{data.bestExerciseByLoad.categoryName}</span>
                  {": "}
                  <span className="font-semibold tabular-nums text-zinc-100">
                    {formatWeight(data.bestExerciseByLoad.heaviestKgInCategory, { units: data.displayUnits })}{" "}
                    {weightUnitLabel(data.displayUnits)}
                  </span>
                </p>
              </div>
            </section>
          ) : null}

          {data.hasFriendDetailStats && data.topLiftsByCategory.length > 0 ? (
            <section className="mt-6" aria-labelledby="friend-category-lifts-heading">
              <SectionTitle>
                <span id="friend-category-lifts-heading">Top lift by category</span>
              </SectionTitle>
              <ul className="mt-3 divide-y divide-zinc-800/90 rounded-xl border border-zinc-800 bg-zinc-900/50">
                {data.topLiftsByCategory.map((row) => (
                  <li key={row.categoryName} className="px-4 py-3.5 first:rounded-t-xl last:rounded-b-xl">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{row.categoryName}</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-100">{row.exerciseName}</p>
                    <p className="mt-0.5 text-sm text-zinc-400">
                      {formatFriendCategoryLiftSummary(row, data.displayUnits)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.hasFriendDetailStats ? (
            <section className="mt-6" aria-labelledby="friend-activity-heading">
              <SectionTitle>
                <span id="friend-activity-heading">Activity</span>
              </SectionTitle>
              <div className="mt-3 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3 last:border-0 last:pb-0">
                  <span className="text-sm text-zinc-400">Workouts this week</span>
                  <span className="text-sm font-semibold tabular-nums text-zinc-100">
                    {data.workoutsThisWeek.toLocaleString("en-US")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3 last:border-0 last:pb-0">
                  <span className="text-sm text-zinc-400">Current workout streak</span>
                  <span className="text-sm font-semibold tabular-nums text-zinc-100">
                    {data.workoutStreak.toLocaleString("en-US")}{" "}
                    <span className="font-normal text-zinc-500">days</span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-400">Last workout</span>
                  <span className="text-right text-sm font-medium text-zinc-100">
                    {data.lastWorkoutDisplay ?? "—"}
                  </span>
                </div>
              </div>
            </section>
          ) : null}

          {data.relationship === "friend" ? (
            <div className="mt-8">
              <Link
                href={compareHref}
                className="tap-feedback flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
              >
                Compare With Me
              </Link>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
