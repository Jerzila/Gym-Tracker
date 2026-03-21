import { getProfile } from "@/app/actions/profile";
import { SettingsPreferencesForm } from "@/app/components/SettingsPreferencesForm";

export default async function SettingsPreferencesPage() {
  const profile = await getProfile();

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-2 sm:px-6">
      <SettingsPreferencesForm profile={profile} />
    </div>
  );
}
