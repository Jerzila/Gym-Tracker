"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader } from "@/app/components/AppHeader";
import { BottomNav } from "@/app/components/BottomNav";
import { SettingsIcon } from "@/components/icons";

function getPageTitle(pathname: string): string {
  if (pathname === "/profile-setup") return "Complete Your Profile";
  if (pathname === "/") return "Dashboard";
  if (pathname === "/exercises") return "Exercises";
  if (pathname === "/calendar") return "Calendar";
  if (pathname === "/insights") return "Insights";
  if (pathname === "/bodyweight") return "Bodyweight";
  if (pathname === "/account") return "Account";
  if (pathname === "/account/settings") return "Settings";
  if (pathname === "/account/edit-profile") return "Edit Profile";
  if (pathname === "/account/settings/body-metrics") return "Body metrics";
  if (pathname === "/account/settings/preferences") return "Preferences";
  if (pathname === "/account/settings/about") return "About you";
  if (pathname === "/account/settings/security") return "Security";
  if (pathname === "/account/settings/other") return "Other";
  if (pathname === "/categories") return "Categories";
  if (pathname.startsWith("/exercise/")) return "Exercise";
  return "Liftly";
}

function BackToAccountLink() {
  return (
    <Link
      href="/account"
      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
      aria-label="Back to account"
    >
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </Link>
  );
}

function BackToSettingsLink() {
  return (
    <Link
      href="/account/settings"
      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
      aria-label="Back to settings"
    >
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </Link>
  );
}

/** Uses history so Account → Edit Profile → back returns to Account; Settings → Edit Profile → back returns to Settings. */
function EditProfileBackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
      aria-label="Back"
      onClick={() => router.back()}
    >
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

function AccountSettingsLink() {
  return (
    <Link
      href="/account/settings"
      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
      aria-label="Settings"
    >
      <SettingsIcon size={20} aria-hidden />
    </Link>
  );
}

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const isProfileSetup = pathname === "/profile-setup";
  const isExerciseDetail = pathname.startsWith("/exercise/");

  let leftSlot: ReactNode = null;
  let rightSlot: ReactNode = null;

  if (pathname === "/account") {
    rightSlot = <AccountSettingsLink />;
  } else if (pathname === "/account/edit-profile") {
    leftSlot = <EditProfileBackButton />;
  } else if (pathname === "/account/settings") {
    leftSlot = <BackToAccountLink />;
  } else if (pathname.startsWith("/account/settings/")) {
    leftSlot = <BackToSettingsLink />;
  } else if (pathname.startsWith("/account/")) {
    leftSlot = <BackToAccountLink />;
  }

  return (
    <div className={`${isExerciseDetail ? "h-dvh overflow-hidden" : "min-h-dvh"} bg-zinc-950 text-zinc-100`}>
      {!isProfileSetup && <AppHeader title={title} leftSlot={leftSlot} rightSlot={rightSlot} />}
      <main
        className={
          isProfileSetup
            ? ""
            : isExerciseDetail
              ? "h-[calc(100dvh-3.5rem-4.5rem)] overflow-y-auto overscroll-y-none pb-0"
              : "pb-20 md:pb-20"
        }
      >
        {children}
      </main>
      {!isProfileSetup && <BottomNav />}
    </div>
  );
}
