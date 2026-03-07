"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Profile } from "@/lib/types";

type ProfileGuardProps = {
  profile: Profile | null;
  children: React.ReactNode;
};

export function ProfileGuard({ profile, children }: ProfileGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const completed = profile?.profile_completed ?? false;
    const onProfileSetup = pathname === "/profile-setup";

    if (onProfileSetup && completed) {
      router.replace("/");
      return;
    }
    if (!onProfileSetup && !completed) {
      router.replace("/profile-setup");
    }
  }, [profile, pathname, router]);

  return <>{children}</>;
}
