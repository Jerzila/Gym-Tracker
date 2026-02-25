import Link from "next/link";
import { getBodyweightLogs, getBodyweightStats } from "@/app/actions/bodyweight";
import { BodyweightChart } from "@/app/components/BodyweightChart";
import { BodyweightHistoryList } from "@/app/components/BodyweightHistoryList";
import { LogBodyweightForm } from "@/app/components/LogBodyweightForm";

export default async function BodyweightPage() {
  let logs: Awaited<ReturnType<typeof getBodyweightLogs>> = [];
  let stats: Awaited<ReturnType<typeof getBodyweightStats>> = {
    latest: null,
    diffFromPrevious: null,
    avg7Days: null,
    change30Days: null,
  };
  try {
    [logs, stats] = await Promise.all([getBodyweightLogs(), getBodyweightStats()]);
  } catch {
    // Leave empty
  }

  const chartData = [...logs].reverse().map((l) => ({ date: l.date, weight: l.weight }));

  return (
    <>
      <div className="border-b border-zinc-800 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-zinc-500 transition hover:text-zinc-300"
            aria-label="Back to dashboard"
          >
            ←
          </Link>
          <h2 className="text-lg font-semibold tracking-tight">Bodyweight</h2>
        </div>
      </div>

      <main className="mx-auto max-w-xl px-4 py-6 sm:px-6">
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
            Log bodyweight
          </h2>
          <LogBodyweightForm />
        </section>

        {(stats.avg7Days != null || stats.change30Days != null) && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
              Summary
            </h2>
            <div className="flex flex-wrap gap-3">
              {stats.avg7Days != null && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                  <p className="text-xs text-zinc-500">7-day average</p>
                  <p className="text-lg font-semibold">{stats.avg7Days} kg</p>
                </div>
              )}
              {stats.change30Days != null && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                  <p className="text-xs text-zinc-500">Change (30 days)</p>
                  <p
                    className={`text-lg font-semibold ${
                      stats.change30Days >= 0 ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {stats.change30Days >= 0 ? "+" : ""}
                    {stats.change30Days} kg
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {chartData.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
              Weight over time
            </h2>
            <BodyweightChart data={chartData} />
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
            History
          </h2>
          {logs.length === 0 ? (
            <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-center text-zinc-500">
              No entries yet. Log your weight above.
            </p>
          ) : (
            <BodyweightHistoryList logs={logs} />
          )}
        </section>
      </main>
    </>
  );
}
