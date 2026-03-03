"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCategory, updateCategory, deleteCategory } from "@/app/actions/categories";
import type { Category } from "@/lib/types";
import { buttonClass } from "@/app/components/Button";

function addFormAction(_: { error?: string } | undefined, formData: FormData) {
  return createCategory(formData);
}

function renameFormAction(
  _: { error?: string } | undefined,
  formData: FormData
) {
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing id" };
  return updateCategory(id, formData);
}

export function ManageCategoriesClient({
  categories,
  exerciseCountByCategoryId,
}: {
  categories: Category[];
  exerciseCountByCategoryId: Record<string, number>;
}) {
  const router = useRouter();
  const [addState, addAction] = useActionState(addFormAction, undefined);
  const [renameState, renameAction] = useActionState(renameFormAction, undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState<string | null>(null);

  useEffect(() => {
    if (addState && !addState.error) router.refresh();
  }, [addState, router]);
  useEffect(() => {
    if (renameState && !renameState.error) {
      setEditingId(null);
      router.refresh();
    }
  }, [renameState, router]);

  async function handleDelete(id: string) {
    setDeletePending(id);
    await deleteCategory(id);
    setDeletePending(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-medium text-zinc-400">Add category</h3>
        <form action={addAction} className="flex gap-2">
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Calves"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="submit"
            className={buttonClass.primary}
          >
            Add
          </button>
        </form>
        {addState?.error && (
          <p className="mt-2 text-sm text-red-400">{addState.error}</p>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium text-zinc-400">Your categories</h3>
        <ul className="space-y-2">
          {categories.map((cat) => {
            const count = exerciseCountByCategoryId[cat.id] ?? 0;
            const canDelete = count === 0;
            const isEditing = editingId === cat.id;

            if (isEditing) {
              return (
                <li
                  key={cat.id}
                  className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2"
                >
                  <form
                    action={renameAction}
                    className="flex flex-1 gap-2"
                    onSubmit={() => setEditingId(null)}
                  >
                    <input type="hidden" name="id" value={cat.id} />
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={cat.name}
                      className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="submit"
                      className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-zinc-950 transition-[transform,filter] duration-[100ms] ease-out active:scale-[0.98] active:brightness-95 hover:bg-amber-500 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className={`${buttonClass.ghost} px-2 py-1 text-xs`}
                    >
                      Cancel
                    </button>
                  </form>
                </li>
              );
            }

            return (
              <li
                key={cat.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
              >
                <span className="font-medium text-zinc-200">{cat.name}</span>
                <div className="flex items-center gap-2">
                  {count > 0 && (
                    <span className="text-xs text-zinc-500">
                      {count} exercise{count !== 1 ? "s" : ""}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingId(cat.id)}
                    className={`${buttonClass.ghost} px-2 py-1 text-xs`}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat.id)}
                    disabled={!canDelete || deletePending === cat.id}
                    title={
                      canDelete
                        ? "Delete category"
                        : "Reassign or delete exercises in this category first"
                    }
                    className={`${buttonClass.danger} px-2 py-1 text-xs disabled:cursor-not-allowed`}
                  >
                    {deletePending === cat.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {renameState?.error && (
          <p className="mt-2 text-sm text-red-400">{renameState.error}</p>
        )}
      </section>
    </div>
  );
}
