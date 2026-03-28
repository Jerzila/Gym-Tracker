/** Client-safe leaderboard tab config (do not import from `app/actions/*` in Client Components). */

export const FRIEND_LEADERBOARD_CATEGORIES = [
  "overall",
  "muscles",
  "volume",
  "prs",
  "consistency",
] as const;
export type FriendLeaderboardCategory = (typeof FRIEND_LEADERBOARD_CATEGORIES)[number];

export const FRIEND_LEADERBOARD_MUSCLE_TABS = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "biceps",
  "triceps",
] as const;
export type FriendLeaderboardMuscleTab = (typeof FRIEND_LEADERBOARD_MUSCLE_TABS)[number];
