export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      exercises: {
        Row: { id: string; name: string; rep_min: number; rep_max: number; created_at: string };
        Insert: { id?: string; name: string; rep_min: number; rep_max: number; created_at?: string };
        Update: { id?: string; name?: string; rep_min?: number; rep_max?: number; created_at?: string };
      };
      workouts: {
        Row: { id: string; exercise_id: string; date: string; weight: number; created_at: string };
        Insert: { id?: string; exercise_id: string; date: string; weight: number; created_at?: string };
        Update: { id?: string; exercise_id?: string; date?: string; weight?: number; created_at?: string };
      };
      sets: {
        Row: { id: string; workout_id: string; reps: number };
        Insert: { id?: string; workout_id: string; reps: number };
        Update: { id?: string; workout_id?: string; reps?: number };
      };
      bodyweight_logs: {
        Row: { id: string; weight: number; date: string; created_at: string };
        Insert: { id?: string; weight: number; date: string; created_at?: string };
        Update: { id?: string; weight?: number; date?: string; created_at?: string };
      };
    };
  };
};
