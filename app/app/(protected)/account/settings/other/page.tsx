import { signOut } from "@/app/actions/auth";
import { DeleteAccountSection } from "@/app/components/DeleteAccountSection";
import { RestorePurchasesRow } from "@/app/components/RestorePurchasesRow";

export default function SettingsOtherPage() {
  return (
    <div className="mx-auto max-w-xl space-y-3 px-4 pb-24 pt-2 sm:px-6">
      <RestorePurchasesRow />
      <DeleteAccountSection />
      <form action={signOut}>
        <button
          type="submit"
          className="tap-feedback flex w-full items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-4 text-left transition-colors hover:border-red-500/50 hover:bg-red-950/30 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-red-300">Sign out</p>
            <p className="mt-1 text-xs leading-relaxed text-red-200/60">Log out of your account</p>
          </div>
          <span className="shrink-0 text-lg text-red-200/50" aria-hidden>
            ›
          </span>
        </button>
      </form>
    </div>
  );
}
