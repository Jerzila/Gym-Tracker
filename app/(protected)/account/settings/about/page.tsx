import { getProfile } from "@/app/actions/profile";
import { SettingsAboutForm } from "@/app/components/SettingsAboutForm";

export default async function SettingsAboutPage() {
  const profile = await getProfile();

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-2 sm:px-6">
      <SettingsAboutForm profile={profile} />
    </div>
  );
}
