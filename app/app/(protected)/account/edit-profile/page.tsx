import { getProfile } from "@/app/actions/profile";
import { SettingsProfileForm } from "@/app/components/SettingsProfileForm";

export default async function EditProfilePage() {
  const profile = await getProfile();

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-2 sm:px-6">
      <SettingsProfileForm profile={profile} />
    </div>
  );
}
