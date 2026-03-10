import { ProtectedShell } from "@/app/components/ProtectedShell";
import { ToastProvider } from "@/app/components/Toast";
import { ProfileGuard } from "@/app/components/ProfileGuard";
import { UnitsProvider } from "@/app/components/UnitsContext";
import { WorkoutDataCacheProvider } from "@/app/components/WorkoutDataCacheContext";
import { getProfile } from "@/app/actions/profile";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  return (
    <>
      <ToastProvider>
        <ProfileGuard profile={profile}>
          <UnitsProvider profile={profile}>
            <WorkoutDataCacheProvider>
              <ProtectedShell>{children}</ProtectedShell>
            </WorkoutDataCacheProvider>
          </UnitsProvider>
        </ProfileGuard>
      </ToastProvider>
    </>
  );
}
