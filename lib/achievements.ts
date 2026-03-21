import { RANK_ORDER } from "@/lib/strengthRanking";

export const ACHIEVEMENT_LEVELS = 10;

/** Workouts logged — thresholds per level (level 1 … 10). */
export const WORKOUT_ACHIEVEMENT_THRESHOLDS = [
  1, 5, 10, 25, 50, 100, 200, 400, 750, 1000,
] as const;

/** PRs hit — thresholds per level. */
export const PR_ACHIEVEMENT_THRESHOLDS = [
  1, 3, 10, 25, 50, 100, 200, 400, 750, 1000,
] as const;

export const WORKOUT_LEVEL_TITLES = [
  "First Workout",
  "5 Workouts",
  "10 Workouts",
  "25 Workouts",
  "50 Workouts",
  "100 Workouts",
  "200 Workouts",
  "400 Workouts",
  "750 Workouts",
  "1000 Workouts",
] as const;

export const PR_LEVEL_TITLES = [
  "First PR",
  "3 PRs",
  "10 PRs",
  "25 PRs",
  "50 PRs",
  "100 PRs",
  "200 PRs",
  "400 PRs",
  "750 PRs",
  "1000 PRs",
] as const;

/** Rank milestones (level 1 = Starter … level 10 = GOAT). Newbie unlocks none. */
export const RANK_PROGRESSION_RANKS = [
  "Starter",
  "Apprentice",
  "Lifter",
  "Semi-Pro",
  "Pro",
  "Elite",
  "Master",
  "Grandmaster",
  "Titan",
  "GOAT",
] as const;

export const RANK_PROGRESSION_TITLES = [
  "Reach Starter",
  "Reach Apprentice",
  "Reach Lifter",
  "Reach Semi-Pro",
  "Reach Pro",
  "Reach Elite",
  "Reach Master",
  "Reach Grandmaster",
  "Reach Titan",
  "Reach GOAT",
] as const;

export function achievementLevelFromThresholds(
  count: number,
  thresholds: readonly number[]
): number {
  let level = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (count >= thresholds[i]) level = i + 1;
  }
  return level;
}

export function workoutAchievementLevel(workoutCount: number): number {
  return achievementLevelFromThresholds(workoutCount, WORKOUT_ACHIEVEMENT_THRESHOLDS);
}

export function prAchievementLevel(prCount: number): number {
  return achievementLevelFromThresholds(prCount, PR_ACHIEVEMENT_THRESHOLDS);
}

/**
 * Highest rank progression level unlocked (0–10).
 * Compares strength `overallRank` to RANK_ORDER; each milestone rank must be reached or passed.
 */
export function rankProgressionLevel(overallRank: string | null): number {
  if (!overallRank) return 0;
  const currentIdx = RANK_ORDER.indexOf(overallRank as (typeof RANK_ORDER)[number]);
  if (currentIdx < 0) return 0;

  let level = 0;
  for (let i = 0; i < RANK_PROGRESSION_RANKS.length; i++) {
    const milestone = RANK_PROGRESSION_RANKS[i];
    const needIdx = RANK_ORDER.indexOf(milestone as (typeof RANK_ORDER)[number]);
    if (needIdx >= 0 && currentIdx >= needIdx) level = i + 1;
  }
  return level;
}

function rankProgressionSubtitle(level: number): string {
  if (level <= 0) return "Reach Starter";
  return RANK_PROGRESSION_TITLES[level - 1].replace(/^Reach /, "Reached ");
}

/** Single-line copy for Account card. */
export function workoutAchievementDisplayLine(level: number): string {
  if (level <= 0) return "Log your first workout";
  return `${WORKOUT_LEVEL_TITLES[level - 1]} logged`;
}

export function prAchievementDisplayLine(level: number): string {
  if (level <= 0) return "Hit your first PR";
  return `${PR_LEVEL_TITLES[level - 1]} hit`;
}

export function rankAchievementDisplayLine(level: number): string {
  return rankProgressionSubtitle(level);
}
