import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/app/components/AppHeader";
import { BackArrowButton } from "@/app/components/BackArrowButton";
import { FriendProfileStrengthMap } from "@/app/components/FriendProfileStrengthMap";
import { ProfileFriendActions } from "@/app/components/ProfileFriendActions";
import { RankBadge } from "@/app/components/RankBadge";
import { getProfilePageDataForViewer } from "@/app/actions/social";
import { tierFromStoredOverallRank } from "@/lib/tierFromStoredOverallRank";

type Props = { params: Promise<{ userId: string }> };

function formatVolumeKg(kg: number): string {
  return Math.round(kg).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold tracking-tight text-zinc-200">{children}</h2>;
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums leading-snug text-zinc-100">{value}</p>
    </div>
  );
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

          {data.hasFriendDetailStats && data.bestMuscle ? (
            <section className="mt-6" aria-labelledby="friend-best-muscle-heading">
              <SectionTitle>
                <span id="friend-best-muscle-heading">Best Muscle</span>
              </SectionTitle>
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-base font-semibold text-zinc-100">{data.bestMuscle.linePrimary}</p>
                <p className="mt-1 text-sm text-zinc-400">{data.bestMuscle.linePercentile}</p>
              </div>
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
