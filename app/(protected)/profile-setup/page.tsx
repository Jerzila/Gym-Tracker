import { getProfile } from "@/app/actions/profile";
import { redirect } from "next/navigation";
import { ProfileSetupForm } from "@/app/components/ProfileSetupForm";

export default async function ProfileSetupPage() {
  const profile = await getProfile();
  if (profile?.profile_completed) {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-xl px-4 pt-6 sm:px-6">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            This helps Liftly provide accurate strength insights and comparisons.
          </p>
        </div>
        <ProfileSetupForm profile={profile} />
      </div>
    </main>
  );
}
