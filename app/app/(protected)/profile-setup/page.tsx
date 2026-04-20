import { getProfile } from "@/app/actions/profile";
import { APP_HOME } from "@/lib/appRoutes";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/app/components/OnboardingFlow";

export default async function ProfileSetupPage() {
  const profile = await getProfile();
  if (profile?.profile_completed) {
    redirect(APP_HOME);
  }

  return (
    <main className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <OnboardingFlow profile={profile} />
      </div>
    </main>
  );
}
