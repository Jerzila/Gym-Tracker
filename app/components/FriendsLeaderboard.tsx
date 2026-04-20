"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonClass } from "@/app/components/Button";
import { RankBadge } from "@/app/components/RankBadge";
import { getFriendsLeaderboard, type FriendLeaderboardEntry } from "@/app/actions/social";
import {
  FRIEND_LEADERBOARD_CATEGORIES,
  FRIEND_LEADERBOARD_MUSCLE_TABS,
  type FriendLeaderboardCategory,
  type FriendLeaderboardMuscleTab,
} from "@/lib/friendsLeaderboard";
import { tierFromStoredOverallRank } from "@/lib/tierFromStoredOverallRank";
import { useProAccess } from "@/app/components/ProAccessProvider";
import { appHref } from "@/lib/appRoutes";
import { RankCrownIcon } from "@/app/components/RankCrownIcon";
import { showCrownForLiftlyPro } from "@/lib/showRankCrown";

function RankMedal({ position }: { position: number }) {
  const base =
    "flex size-[26px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums leading-none shadow-inner";
  if (position === 1) {
    return (
      <span
        className={`${base} bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 text-amber-950 ring-1 ring-amber-300/40`}
        aria-hidden
      >
        1
      </span>
    );
  }
  if (position === 2) {
    return (
      <span
        className={`${base} bg-gradient-to-b from-zinc-100 via-zinc-300 to-zinc-500 text-zinc-800 ring-1 ring-white/15`}
        aria-hidden
      >
        2
      </span>
    );
  }
  if (position === 3) {
    return (
      <span
        className={`${base} bg-gradient-to-b from-orange-200 via-amber-700 to-amber-950 text-amber-950 ring-1 ring-orange-400/35`}
        aria-hidden
      >
        3
      </span>
    );
  }
  return (
    <span className={`${base} bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700`} aria-hidden>
      {position}
    </span>
  );
}

const CATEGORY_LABEL: Record<FriendLeaderboardCategory, string> = {
  overall: "Overall",
  muscles: "Muscles",
  volume: "Volume",
  prs: "PRs",
  consistency: "Consistency",
};

const MUSCLE_LABEL: Record<FriendLeaderboardMuscleTab, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
};

const SUBTITLE: Record<FriendLeaderboardCategory, string> = {
  overall: "By rank",
  muscles: "By muscle %",
  volume: "By volume",
  prs: "By PRs",
  consistency: "Last 30 days",
};

const tabBase =
  "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition tap-feedback sm:px-3";
const tabIdle = "border border-transparent bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200";
const tabActive = "border border-amber-500/40 bg-amber-950/30 text-amber-100";

const PREVIEW_LIMIT = 5;

export function FriendsLeaderboard() {
  const { hasPro, requirePro } = useProAccess();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<FriendLeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<FriendLeaderboardCategory>("overall");
  const [muscle, setMuscle] = useState<FriendLeaderboardMuscleTab>("chest");
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [hasFriends, setHasFriends] = useState(true);

  useEffect(() => {
    setShowFullLeaderboard(false);
  }, [category, muscle, hasPro]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { entries: rows, error: err, hasFriends: hf } = await getFriendsLeaderboard({
          category,
          muscle,
        });
        if (cancelled) return;
        if (err) setError(err);
        setEntries(rows ?? []);
        setHasFriends(hf);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load leaderboard.");
        setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [category, muscle]);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-100">Friends leaderboard</h3>
        <p className="text-xs text-zinc-500">{SUBTITLE[category]}</p>
      </div>

      <div
        className="mt-3 flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Leaderboard category"
      >
        {FRIEND_LEADERBOARD_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            onClick={() => {
              if (!hasPro && c !== "overall") {
                requirePro("full_leaderboard");
                return;
              }
              setCategory(c);
            }}
            className={`${tabBase} ${category === c ? tabActive : tabIdle}`}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      {category === "muscles" ? (
        <div
          className="mt-2 flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Muscle group"
        >
          {FRIEND_LEADERBOARD_MUSCLE_TABS.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={muscle === m}
              onClick={() => setMuscle(m)}
              className={`${tabBase} ${muscle === m ? tabActive : tabIdle}`}
            >
              {MUSCLE_LABEL[m]}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-3 text-sm text-zinc-500">Loading…</p>
      ) : error ? (
        <p className="mt-3 text-sm text-red-400/90">{error}</p>
      ) : !hasFriends ? (
        <div className="mt-3 rounded-lg border border-dashed border-zinc-700/90 bg-zinc-950/35 px-4 py-5 text-center">
          <p className="text-sm text-zinc-300">Add friends to compare ranks on the leaderboard.</p>
          <Link
            href={appHref("/social/search")}
            className={`${buttonClass.primary} mt-4 inline-flex w-full max-w-[240px] justify-center sm:w-auto`}
          >
            Find friends
          </Link>
        </div>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No leaderboard data yet.</p>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {(showFullLeaderboard && hasPro ? entries : entries.slice(0, PREVIEW_LIMIT)).map((e, index) => {
              const position = index + 1;
              const crown = showCrownForLiftlyPro(e.liftly_pro);
              const rowClass = `flex items-center gap-3 rounded-lg border px-3 py-3 tap-feedback ${
                e.is_current_user
                  ? "border-amber-500/35 bg-amber-950/20"
                  : "border-zinc-800 bg-[#1a1a1a] transition-colors hover:border-zinc-700"
              }`;
              const inner = (
                <>
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="sr-only">{`Rank ${position}`}</span>
                    <RankMedal position={position} />
                    <span
                      className="flex min-w-0 items-center gap-1 truncate text-sm font-medium leading-snug text-zinc-100"
                      title={e.is_current_user ? e.username : undefined}
                    >
                      <span className="truncate">{e.is_current_user ? "You" : e.username}</span>
                      {crown ? <RankCrownIcon size={15} title="Liftly Pro" /> : null}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <RankBadge rank={e.rank_badge} tier={tierFromStoredOverallRank(e.overall_rank)} size={40} />
                    <div className="flex min-h-[40px] flex-col items-end justify-center text-right leading-tight">
                      <span className="text-sm font-medium text-zinc-100">{e.overall_rank}</span>
                      <span className="mt-1 text-xs text-zinc-500">{e.top_percentile_display}</span>
                    </div>
                  </div>
                </>
              );
              return (
                <li key={e.user_id}>
                  {e.is_current_user ? (
                    <div className={rowClass}>{inner}</div>
                  ) : (
                    <Link href={appHref(`/friend/${e.user_id}`)} className={`block ${rowClass}`}>
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          {entries.length > PREVIEW_LIMIT ? (
            <div className="mt-3 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!hasPro) {
                    requirePro("full_leaderboard");
                    return;
                  }
                  setShowFullLeaderboard((v) => !v);
                }}
                aria-expanded={showFullLeaderboard && hasPro}
              >
                {hasPro ? (showFullLeaderboard ? "Show less" : "See full leaderboard") : "Unlock full leaderboard"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
