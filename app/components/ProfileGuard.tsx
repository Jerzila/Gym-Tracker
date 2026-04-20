"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Profile } from "@/lib/types";
import { APP_HOME, appHref } from "@/lib/appRoutes";

type ProfileGuardProps = {
  profile: Profile | null;
  children: React.ReactNode;
};

export function ProfileGuard({ profile, children }: ProfileGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const completed = profile?.profile_completed ?? false;
    const onProfileSetup = pathname === appHref("/profile-setup");

    if (onProfileSetup && completed) {
      router.replace(APP_HOME);
      return;
    }
    if (!onProfileSetup && !completed) {
      router.replace(appHref("/profile-setup"));
    }
  }, [profile, pathname, router]);

  return <>{children}</>;
}
