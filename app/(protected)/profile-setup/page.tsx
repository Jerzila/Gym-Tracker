import { getProfile } from "@/app/actions/profile";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/app/components/OnboardingFlow";

export default async function ProfileSetupPage() {
  const profile = await getProfile();
  if (profile?.profile_completed) {
    redirect("/");
  }

  return (
    <main className="h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="flex h-full flex-col overflow-hidden">
        <OnboardingFlow profile={profile} />
      </div>
    </main>
  );
}
