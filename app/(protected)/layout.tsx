import { ProtectedShell } from "@/app/components/ProtectedShell";
import { ToastProvider } from "@/app/components/Toast";
import { UsernameDisplayProvider } from "@/app/components/UsernameDisplayContext";
import { ProfileGuard } from "@/app/components/ProfileGuard";
import { UnitsProvider } from "@/app/components/UnitsContext";
import { WorkoutDataCacheProvider } from "@/app/components/WorkoutDataCacheContext";
import { PreloadInsights } from "@/app/components/PreloadInsights";
import { ensureUsernameBackfill, getProfile } from "@/app/actions/profile";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rawProfile = await getProfile();
  const profile = await ensureUsernameBackfill(rawProfile);
  return (
    <>
      <ToastProvider>
        <UsernameDisplayProvider initialUsername={profile?.username ?? null}>
          <ProfileGuard profile={profile}>
            <UnitsProvider profile={profile}>
              <WorkoutDataCacheProvider>
                <PreloadInsights />
                <ProtectedShell>{children}</ProtectedShell>
              </WorkoutDataCacheProvider>
            </UnitsProvider>
          </ProfileGuard>
        </UsernameDisplayProvider>
      </ToastProvider>
    </>
  );
}
