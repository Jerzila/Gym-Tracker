"use client";

import { useState } from "react";
import { updateExerciseNotes } from "@/app/actions/exercises";
import { buttonClass } from "@/app/components/Button";
import { useToast } from "@/app/components/Toast";

type Props = {
  exerciseId: string;
  initialNotes: string | null;
};

export function ExerciseNotesSection({ exerciseId, initialNotes }: Props) {
  const [savedNote, setSavedNote] = useState(initialNotes ?? "");
  const [editBuffer, setEditBuffer] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSave() {
    setSaving(true);
    const { error } = await updateExerciseNotes(exerciseId, editBuffer.trim() || null);
    setSaving(false);
    if (error) {
      toast.show(error);
      return;
    }
    setSavedNote(editBuffer.trim() || "");
    setEditing(false);
    toast.show("Notes saved.");
  }

  function handleCancel() {
    setEditBuffer(savedNote || "");
    setEditing(false);
  }

  function startEditing() {
    setEditBuffer(savedNote || "");
    setEditing(true);
  }

  const hasNotes = savedNote.length > 0;

  return (
    <section className="h-full rounded-xl border border-zinc-700/60 bg-zinc-900/30 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Notes
        </h3>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className={`text-xs ${buttonClass.ghost} px-2 py-1 text-zinc-500 hover:text-zinc-300`}
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={editBuffer}
            onChange={(e) => setEditBuffer(e.target.value)}
            placeholder="e.g. Seat height 4th tier, Bench at 45°, Wide grip"
            rows={3}
            className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className={buttonClass.ghost}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={buttonClass.primary}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1 max-h-10 overflow-hidden whitespace-pre-wrap text-sm text-zinc-300">
          {hasNotes ? savedNote : "No notes"}
        </p>
      )}
    </section>
  );
}
