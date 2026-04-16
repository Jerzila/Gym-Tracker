"use client";

import { useState } from "react";
import { LogWorkoutForm } from "@/app/components/LogWorkoutForm";
import { ExerciseNotesSection } from "@/app/components/ExerciseNotesSection";
import type { LoadType } from "@/lib/loadType";

type Props = {
  exerciseId: string;
  repMin: number;
  repMax: number;
  initialNotes: string | null;
  loadType?: LoadType;
  /** When the exercise is removed from the list, hide logging until restored. */
  loggingDisabled?: boolean;
};

export function ExerciseLogAndNotes({
  exerciseId,
  repMin,
  repMax,
  initialNotes,
  loadType,
  loggingDisabled,
}: Props) {
  const [isLoggingWorkout, setIsLoggingWorkout] = useState(false);

  if (loggingDisabled) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-zinc-800/80 bg-zinc-950/30 px-3 py-3 text-center text-xs text-zinc-500">
          New sets are hidden while this exercise is removed. Restore it to your list above to log again.
        </p>
        <ExerciseNotesSection exerciseId={exerciseId} initialNotes={initialNotes} readOnly />
      </div>
    );
  }

  return (
    <div className={isLoggingWorkout ? "space-y-3" : "grid grid-cols-2 gap-2.5"}>
      <div className="min-w-0">
        <LogWorkoutForm
          exerciseId={exerciseId}
          repMin={repMin}
          repMax={repMax}
          loadType={loadType}
          onExpandedChange={setIsLoggingWorkout}
        />
      </div>
      <div className={isLoggingWorkout ? "" : "min-w-0"}>
        <ExerciseNotesSection exerciseId={exerciseId} initialNotes={initialNotes} />
      </div>
    </div>
  );
}
