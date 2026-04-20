import { getProfile } from "@/app/actions/profile";
import { SettingsBodyMetricsForm } from "@/app/components/SettingsBodyMetricsForm";

export default async function SettingsBodyMetricsPage() {
  const profile = await getProfile();

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-2 sm:px-6">
      <SettingsBodyMetricsForm profile={profile} />
    </div>
  );
}
