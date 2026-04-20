import { SettingsPasswordReset } from "@/app/components/SettingsPasswordReset";

export default function SettingsSecurityPage() {
  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-2 sm:px-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <SettingsPasswordReset />
      </div>
    </div>
  );
}
