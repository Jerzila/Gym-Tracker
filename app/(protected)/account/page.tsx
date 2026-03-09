import { signOut } from "@/app/actions/auth";
import { getProfile } from "@/app/actions/profile";
import { AccountProfileSection } from "@/app/components/AccountProfileSection";
import { InstallAppButton } from "@/app/components/InstallAppButton";

export default async function AccountPage() {
  const profile = await getProfile();

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6 sm:px-6">
      <div className="space-y-6">
        <AccountProfileSection profile={profile} />

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Settings
          </h2>
          <p className="text-sm text-zinc-400">
            App settings and preferences.
          </p>
          <div className="mt-3">
            <InstallAppButton variant="in-app" />
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Preferences
          </h2>
          <p className="text-sm text-zinc-400">
            Customize your experience.
          </p>
        </section>

        <div className="pt-4">
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-red-500/30 px-4 py-2 text-red-400 transition-colors hover:bg-red-500/10"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
