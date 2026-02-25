export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: { id: string; user_id: string; name: string; created_at: string };
        Insert: { id?: string; user_id: string; name: string; created_at?: string };
        Update: { id?: string; user_id?: string; name?: string; created_at?: string };
      };
      exercises: {
        Row: { id: string; user_id: string; category_id: string; name: string; rep_min: number; rep_max: number; created_at: string };
        Insert: { id?: string; user_id: string; category_id: string; name: string; rep_min: number; rep_max: number; created_at?: string };
        Update: { id?: string; user_id?: string; category_id?: string; name?: string; rep_min?: number; rep_max?: number; created_at?: string };
      };
      workouts: {
        Row: { id: string; user_id: string; exercise_id: string; date: string; weight: number; created_at: string };
        Insert: { id?: string; user_id: string; exercise_id: string; date: string; weight: number; created_at?: string };
        Update: { id?: string; user_id?: string; exercise_id?: string; date?: string; weight?: number; created_at?: string };
      };
      sets: {
        Row: { id: string; workout_id: string; reps: number };
        Insert: { id?: string; workout_id: string; reps: number };
        Update: { id?: string; workout_id?: string; reps?: number };
      };
      bodyweight_logs: {
        Row: { id: string; user_id: string; weight: number; date: string; created_at: string };
        Insert: { id?: string; user_id: string; weight: number; date: string; created_at?: string };
        Update: { id?: string; user_id?: string; weight?: number; date?: string; created_at?: string };
      };
    };
  };
};
