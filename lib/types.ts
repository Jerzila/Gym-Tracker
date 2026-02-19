export type Exercise = {
  id: string;
  name: string;
  rep_min: number;
  rep_max: number;
  created_at: string;
};

export type Workout = {
  id: string;
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
  weight: number;
  date: string;
  created_at: string;
};
