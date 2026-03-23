export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          birthday: string | null;
          gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
          country: string | null;
          body_weight: number | null;
          height: number | null;
          units: "metric" | "imperial" | null;
          profile_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          birthday?: string | null;
          gender?: "male" | "female" | "other" | "prefer_not_to_say" | null;
          country?: string | null;
          body_weight?: number | null;
          height?: number | null;
          units?: "metric" | "imperial" | null;
          profile_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          birthday?: string | null;
          gender?: "male" | "female" | "other" | "prefer_not_to_say" | null;
          country?: string | null;
          body_weight?: number | null;
          height?: number | null;
          units?: "metric" | "imperial" | null;
          profile_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: { id: string; user_id: string; name: string; created_at: string };
        Insert: { id?: string; user_id: string; name: string; created_at?: string };
        Update: { id?: string; user_id?: string; name?: string; created_at?: string };
      };
      exercises: {
        Row: { id: string; user_id: string; category_id: string; name: string; rep_min: number; rep_max: number; notes: string | null; created_at: string };
        Insert: { id?: string; user_id: string; category_id: string; name: string; rep_min: number; rep_max: number; notes?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; category_id?: string; name?: string; rep_min?: number; rep_max?: number; notes?: string | null; created_at?: string };
      };
      exercise_categories: {
        Row: { exercise_id: string; category_id: string; created_at: string };
        Insert: { exercise_id: string; category_id: string; created_at?: string };
        Update: { exercise_id?: string; category_id?: string; created_at?: string };
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
