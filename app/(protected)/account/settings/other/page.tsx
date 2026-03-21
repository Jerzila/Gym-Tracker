import { signOut } from "@/app/actions/auth";
import { buttonClass } from "@/app/components/Button";

export default function SettingsOtherPage() {
  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-8 sm:px-6">
      <form action={signOut}>
        <button
          type="submit"
          className={`${buttonClass.secondary} w-full border-red-500/40 text-red-400 hover:border-red-500/60 hover:bg-red-950/30 hover:text-red-300`}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
