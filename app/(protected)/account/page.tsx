import { signOut } from "@/app/actions/auth";
import { getProfile } from "@/app/actions/profile";
import { buttonClass } from "@/app/components/Button";
import { AccountProfileSection } from "@/app/components/AccountProfileSection";

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
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <form action={signOut}>
            <button type="submit" className={`${buttonClass.ghost} w-full justify-start text-zinc-400`}>
              Log out
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
