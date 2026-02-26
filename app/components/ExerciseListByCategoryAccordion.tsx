"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExerciseCard } from "@/app/components/ExerciseCard";
import type { Category, Exercise } from "@/lib/types";

const STORAGE_KEY = "gym-accordion-open";
const TRANSITION_MS = 250;

function loadStoredOpenIds(categoryOrder: string[]): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    const valid = new Set(parsed.filter((id) => categoryOrder.includes(id)));
    return valid;
  } catch {
    return new Set();
  }
}

function saveStoredOpenIds(openIds: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...openIds]));
  } catch {
    // ignore
  }
}

export function ExerciseListByCategoryAccordion({
  exercises,
  categories,
  defaultExpandedCategoryIds,
}: {
  exercises: Exercise[];
  categories: Category[];
  defaultExpandedCategoryIds?: string[];
}) {
  const { byCategoryId, categoryById, categoryOrder } = useMemo(() => {
    const byCategoryId = new Map<string, Exercise[]>();
    for (const ex of exercises) {
      const list = byCategoryId.get(ex.category_id) ?? [];
      list.push(ex);
      byCategoryId.set(ex.category_id, list);
    }
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const order = categories.map((c) => c.id).filter((id) => byCategoryId.has(id));
    return { byCategoryId, categoryById, categoryOrder: order };
  }, [exercises, categories]);

  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    if (defaultExpandedCategoryIds?.length) {
      return new Set(
        defaultExpandedCategoryIds.filter((id) => categoryOrder.includes(id))
      );
    }
    const stored = loadStoredOpenIds(categoryOrder);
    if (stored.size > 0) return stored;
    return new Set(categoryOrder.length > 0 ? [categoryOrder[0]] : []);
  });

  useEffect(() => {
    saveStoredOpenIds(openIds);
  }, [openIds]);

  const toggle = useCallback((categoryId: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  if (categoryOrder.length === 0) return null;

  return (
    <div className="space-y-1">
      {categoryOrder.map((categoryId, index) => {
        const cat = categoryById.get(categoryId);
        const list = byCategoryId.get(categoryId) ?? [];
        if (list.length === 0) return null;
        const isOpen = openIds.has(categoryId);
        const name = cat?.name ?? "Uncategorized";
        return (
          <div
            key={categoryId}
            className={
              index > 0
                ? "border-t border-zinc-800/60 pt-4 mt-4"
                : ""
            }
          >
            <button
              type="button"
              onClick={() => toggle(categoryId)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5 text-left transition duration-200 hover:border-zinc-700 hover:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-zinc-950"
              aria-expanded={isOpen}
              aria-controls={`category-content-${categoryId}`}
              id={`category-header-${categoryId}`}
            >
              <span className="flex items-center gap-2">
                <span
                  className="inline-block text-zinc-400 transition-transform duration-200 ease-out"
                  style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                  aria-hidden
                >
                  ▶
                </span>
                <span className="font-medium text-zinc-200">{name}</span>
                <span className="text-sm text-zinc-500">({list.length})</span>
              </span>
            </button>
            <div
              id={`category-content-${categoryId}`}
              role="region"
              aria-labelledby={`category-header-${categoryId}`}
              className="grid transition-[grid-template-rows] ease-out"
              style={{
                gridTemplateRows: isOpen ? "1fr" : "0fr",
                transitionDuration: `${TRANSITION_MS}ms`,
              }}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className="transition-opacity ease-out"
                  style={{
                    opacity: isOpen ? 1 : 0,
                    transitionDuration: `${TRANSITION_MS}ms`,
                  }}
                >
                  <ul className="space-y-2 pt-2">
                    {list.map((ex) => (
                      <ExerciseCard
                        key={ex.id}
                        exercise={ex}
                        categories={categories}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
