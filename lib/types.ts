export type Profile = {
  id: string;
  name: string | null;
  birthday: string | null;
  gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
  country: string | null;
  body_weight: number | null;
  height: number | null;
  profile_completed: boolean;
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
  rep_min: number;
  rep_max: number;
  notes: string | null;
  created_at: string;
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
};
