"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/app/components/AppHeader";
import { BottomNav } from "@/app/components/BottomNav";

function getPageTitle(pathname: string): string {
  if (pathname === "/profile-setup") return "Complete Your Profile";
  if (pathname === "/") return "Dashboard";
  if (pathname === "/exercises") return "Exercises";
  if (pathname === "/calendar") return "Calendar";
  if (pathname === "/insights") return "Insights";
  if (pathname === "/bodyweight") return "Bodyweight";
  if (pathname === "/account") return "Account";
  if (pathname === "/categories") return "Categories";
  if (pathname.startsWith("/exercise/")) return "Exercise";
  return "Liftly";
}

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const isProfileSetup = pathname === "/profile-setup";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <AppHeader title={title} />
      <main className={isProfileSetup ? "pb-8 md:pb-8" : "pb-20 md:pb-20"}>{children}</main>
      {!isProfileSetup && <BottomNav />}
    </div>
  );
}
