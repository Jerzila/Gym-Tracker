import { signOut } from "@/app/actions/auth";
import { getProfile } from "@/app/actions/profile";
import { AccountProfileSection } from "@/app/components/AccountProfileSection";
import { AccountBodyMetricsSection } from "@/app/components/AccountBodyMetricsSection";
import { UnitsSetting } from "@/app/components/UnitsSetting";
import { InstallAppButton } from "@/app/components/InstallAppButton";

export default async function AccountPage() {
  const profile = await getProfile();

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold text-zinc-100">Account</h1>

      <div className="space-y-6">
        {/* 1. Profile */}
        <AccountProfileSection profile={profile} />

        {/* 2. Body Metrics */}
        <AccountBodyMetricsSection profile={profile} />

        {/* 3. Preferences */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="mb-4 text-sm uppercase tracking-wide text-zinc-400">
            Preferences
          </h2>
          <UnitsSetting profile={profile} />
          <div className="mt-4">
            <InstallAppButton variant="in-app" />
          </div>
        </section>

        {/* 4. Account */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="mb-4 text-sm uppercase tracking-wide text-zinc-400">
            Account
          </h2>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-red-500 px-4 py-2 text-red-500 transition-colors hover:bg-red-500/10"
            >
              Sign Out
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
