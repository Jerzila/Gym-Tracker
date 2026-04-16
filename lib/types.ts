export type Profile = {
  id: string;
  /** Lowercase handle; unique across users */
  username: string | null;
  /** Set when the user last saved a new username (manual); null until first manual change */
  username_last_changed_at: string | null;
  /** Public Supabase Storage URL */
  avatar_url: string | null;
  name: string | null;
  birthday: string | null;
  gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
  country: string | null;
  body_weight: number | null;
  height: number | null;
  /** Set by dashboard FFMI calculator; omitted/null until first calculation */
  ffmi?: number | null;
  /** Body fat % from last FFMI calculation */
  body_fat_percent?: number | null;
  units: "metric" | "imperial" | null;
  profile_completed: boolean;
  /** Full rank label for leaderboard (synced from rankings). */
  overall_rank?: string | null;
  /** Numeric Top X% for leaderboard sort; lower = stronger. */
  overall_percentile?: number | null;
  /** Badge slug e.g. newbie, elite (synced from rankings). */
  rank_badge?: string | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type Exercise = {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  load_type: "weight" | "unilateral" | "bodyweight" | "timed";
  rep_min: number;
  rep_max: number;
  notes: string | null;
  created_at: string;
  /** Set when the exercise is hidden from the list (workouts are kept). */
  deleted_at?: string | null;
};

export type Workout = {
  id: string;
  user_id: string;
  exercise_id: string;
  date: string;
  weight: number;
  created_at: string;
};

export type Set = {
  id: string;
  workout_id: string;
  reps: number;
};

export type WorkoutWithSets = Workout & { sets: Set[] };

export type ExerciseWithWorkouts = Exercise & { workouts: WorkoutWithSets[] };

export type BodyweightLog = {
  id: string;
  user_id: string;
  weight: number;
  date: string;
  created_at: string;
  /** e.g. "setup" for first log from onboarding / profile setup */
  source: string | null;
};
