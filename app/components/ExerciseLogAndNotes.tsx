"use client";

import { useState } from "react";
import { LogWorkoutForm } from "@/app/components/LogWorkoutForm";
import { ExerciseNotesSection } from "@/app/components/ExerciseNotesSection";

type Props = {
  exerciseId: string;
  repMin: number;
  repMax: number;
  initialNotes: string | null;
  loadType?: "bilateral" | "unilateral";
};

export function ExerciseLogAndNotes({ exerciseId, repMin, repMax, initialNotes, loadType }: Props) {
  const [isLoggingWorkout, setIsLoggingWorkout] = useState(false);

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
