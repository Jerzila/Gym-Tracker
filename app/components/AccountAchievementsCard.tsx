import {
  ACHIEVEMENT_LEVELS,
  prAchievementDisplayLine,
  prAchievementLevel,
  rankAchievementDisplayLine,
  rankProgressionLevel,
  workoutAchievementDisplayLine,
  workoutAchievementLevel,
} from "@/lib/achievements";

function LevelStrip({ currentLevel }: { currentLevel: number }) {
  return (
    <div
      className="mt-3 flex gap-1"
      role="list"
      aria-label={`${currentLevel} of ${ACHIEVEMENT_LEVELS} levels unlocked`}
    >
      {Array.from({ length: ACHIEVEMENT_LEVELS }, (_, i) => {
        const unlocked = i < currentLevel;
        return (
          <div
            key={i}
            role="listitem"
            className={`flex h-7 min-w-0 flex-1 items-center justify-center rounded-md text-[11px] font-semibold transition-colors ${
              unlocked
                ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40"
                : "bg-zinc-800/70 text-zinc-600"
            }`}
            aria-label={unlocked ? `Level ${i + 1} unlocked` : `Level ${i + 1} locked`}
          >
            {unlocked ? "✓" : ""}
          </div>
        );
      })}
    </div>
  );
}

function CategoryBlock({
  title,
  level,
  achievementLine,
}: {
  title: string;
  level: number;
  achievementLine: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800/90 bg-zinc-950/40 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-100">
        Level {level} / {ACHIEVEMENT_LEVELS}
      </p>
      <p className="mt-1 text-sm text-zinc-300">{achievementLine}</p>
      <LevelStrip currentLevel={level} />
    </div>
  );
}

export function AccountAchievementsCard({
  workoutCount,
  prCount,
  overallRank,
}: {
  workoutCount: number;
  prCount: number;
  overallRank: string | null;
}) {
  const wLevel = workoutAchievementLevel(workoutCount);
  const pLevel = prAchievementLevel(prCount);
  const rLevel = rankProgressionLevel(overallRank);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-400">Milestones</h2>
      <div className="space-y-4">
        <CategoryBlock
          title="Consistency"
          level={wLevel}
          achievementLine={workoutAchievementDisplayLine(wLevel)}
        />
        <CategoryBlock
          title="Progress"
          level={pLevel}
          achievementLine={prAchievementDisplayLine(pLevel)}
        />
        <CategoryBlock
          title="Climber"
          level={rLevel}
          achievementLine={rankAchievementDisplayLine(rLevel)}
        />
      </div>
    </section>
  );
}
