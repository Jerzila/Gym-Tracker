import { notFound } from "next/navigation";
import { AppHeader } from "@/app/components/AppHeader";
import { BackArrowButton } from "@/app/components/BackArrowButton";
import { RankBadge } from "@/app/components/RankBadge";
import { getFriendProfilePageData } from "@/app/actions/social";
import { tierFromStoredOverallRank } from "@/lib/tierFromStoredOverallRank";

type Props = { params: Promise<{ userId: string }> };

function formatVolumeKg(kg: number): string {
  return Math.round(kg).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default async function FriendProfilePage({ params }: Props) {
  const { userId } = await params;
  const { data, error } = await getFriendProfilePageData(userId);
  if (error || !data || !data.username) notFound();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-950 text-zinc-100">
      <div className="fixed inset-x-0 top-0 z-[210] bg-zinc-950 pt-[env(safe-area-inset-top,0px)]">
        <AppHeader title={data.username} leftSlot={<BackArrowButton />} />
      </div>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-24 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:px-6">
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

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total workouts</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">
                {data.workoutCount.toLocaleString("en-US")}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total PRs</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">
                {data.prCount.toLocaleString("en-US")}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:col-span-1">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total volume</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">
                {formatVolumeKg(data.totalVolumeKg)} kg
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
