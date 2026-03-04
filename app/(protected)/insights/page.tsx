import { getExercises } from "@/app/actions/exercises";
import { InsightsPageContent } from "@/app/components/InsightsPageContent";

export default async function InsightsPage() {
  let exercises: Awaited<ReturnType<typeof getExercises>> = [];
  try {
    exercises = await getExercises();
  } catch {
    // leave empty
  }

  return (
    <>
      <div className="border-b border-zinc-800/60 px-4 py-3 sm:px-6">
        <h2 className="text-lg font-semibold tracking-tight">Insights</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          Training progress, balance, and recommendations
        </p>
      </div>

      <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <InsightsPageContent exercises={exercises} />
      </main>
    </>
  );
}
