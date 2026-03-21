import type { AccountLifetimeStats } from "@/app/actions/workouts";

export function AccountOverallStatsCard({ stats }: { stats: AccountLifetimeStats }) {
  const cells = [
    { label: "Workouts", value: stats.workoutCount },
    { label: "Exercises", value: stats.exerciseCount },
    { label: "Sets", value: stats.setCount },
    { label: "PRs", value: stats.prCount },
  ] as const;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-400">Overall Stats</h2>
      <div className="grid grid-cols-2 gap-4">
        {cells.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-zinc-800/80 bg-zinc-950/30 px-3 py-3 text-center"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
