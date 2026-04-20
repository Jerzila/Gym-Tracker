import { RankBadge } from "@/app/components/RankBadge";
import {
  ACHIEVEMENT_LEVELS,
  MILESTONE_STRIP_RANK_SLUGS,
  RANK_PROGRESSION_RANKS,
  milestoneStripRankAtLevel,
  prAchievementDisplayLine,
  prAchievementLevel,
  rankAchievementDisplayLine,
  rankProgressionLevel,
  workoutAchievementDisplayLine,
  workoutAchievementLevel,
} from "@/lib/achievements";

/** Extra rank label after " · " when it does not already end the achievement sentence (e.g. skip "Reached Pro · Pro"). */
function rankAsideLabel(
  level: number,
  achievementLine: string,
  overallRankHint: string | null | undefined
): string | null {
  if (level < 1) return null;
  const strip = milestoneStripRankAtLevel(level);
  if (!strip) return null;
  const hint = overallRankHint?.trim() || strip;
  if (achievementLine.endsWith(hint)) return null;
  if (achievementLine.endsWith(strip)) return null;
  return hint;
}

function LevelStrip({ currentLevel }: { currentLevel: number }) {
  return (
    <div
      className="mt-3 flex gap-1"
      role="list"
      aria-label={`${currentLevel} of ${ACHIEVEMENT_LEVELS} levels unlocked`}
    >
      {Array.from({ length: ACHIEVEMENT_LEVELS }, (_, i) => {
        const unlocked = i < currentLevel;
        const rankLabel = RANK_PROGRESSION_RANKS[i];
        return (
          <div
            key={i}
            role="listitem"
            className={`flex h-8 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-md border border-zinc-700/50 transition-colors ${
              unlocked ? "bg-zinc-800/50" : "bg-zinc-950/70"
            }`}
            aria-label={
              unlocked ? `Level ${i + 1} unlocked, ${rankLabel}` : `Level ${i + 1} locked`
            }
          >
            {unlocked ? (
              <RankBadge
                rank={MILESTONE_STRIP_RANK_SLUGS[i]}
                tier="I"
                size={26}
                className="max-h-full max-w-full shrink-0 [&_img]:max-h-[1.65rem] [&_img]:max-w-full [&_img]:object-contain"
              />
            ) : null}
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
  overallRankHint,
}: {
  title: string;
  level: number;
  achievementLine: string;
  /** Climber: pass live overall rank string so the aside can match; omit for workout/PR rows. */
  overallRankHint?: string | null;
}) {
  const rankAside = rankAsideLabel(level, achievementLine, overallRankHint);

  return (
    <div className="rounded-lg border border-zinc-800/90 bg-zinc-950/40 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-100">
        Level {level} / {ACHIEVEMENT_LEVELS}
      </p>
      <p className="mt-1 text-sm text-zinc-300">
        {achievementLine}
        {rankAside ? (
          <>
            <span className="text-zinc-600"> · </span>
            <span className="font-medium text-zinc-400">{rankAside}</span>
          </>
        ) : null}
      </p>
      <LevelStrip currentLevel={level} />
    </div>
  );
}

export function AccountAchievementsCard({
  workoutCount,
  prCount,
  overallRank,
  sectionHeading = "Milestones",
}: {
  workoutCount: number;
  prCount: number;
  overallRank: string | null;
  /** e.g. friend profile: "Alex's milestones" */
  sectionHeading?: string;
}) {
  const wLevel = workoutAchievementLevel(workoutCount);
  const pLevel = prAchievementLevel(prCount);
  const rLevel = rankProgressionLevel(overallRank);
  const climberLine = rankAchievementDisplayLine(rLevel);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-400">{sectionHeading}</h2>
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
          achievementLine={climberLine}
          overallRankHint={overallRank}
        />
      </div>
    </section>
  );
}
