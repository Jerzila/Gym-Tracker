import { getProfile } from "@/app/actions/profile";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/app/components/OnboardingFlow";

export default async function ProfileSetupPage() {
  const profile = await getProfile();
  if (profile?.profile_completed) {
    redirect("/");
  }

  return (
    <main className="min-h-dvh bg-zinc-950">
      <OnboardingFlow profile={profile} />
    </main>
  );
}
