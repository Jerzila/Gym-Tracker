"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/app/components/AppHeader";
import { BottomNav } from "@/app/components/BottomNav";
import { CalendarIcon, SearchIcon, SettingsIcon, UserPlusIcon } from "@/components/icons";
import { BackArrowButton } from "@/app/components/BackArrowButton";
import { SocialInviteHeaderButton } from "@/app/components/SocialInviteHeaderButton";

function getPageTitle(pathname: string): string {
  if (pathname === "/profile-setup") return "Complete Your Profile";
  if (pathname === "/") return "Dashboard";
  if (pathname === "/exercises") return "Exercises";
  if (pathname === "/calendar") return "Calendar";
  if (pathname === "/insights") return "Insights";
  if (pathname === "/insights/strength-progress") return "Insights";
  if (pathname === "/insights/strength-compare") return "Compare strength";
  if (pathname === "/social") return "Social";
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
  if (pathname === "/social/search") return "Search Friends";
  if (pathname === "/social/requests") return "Friend Requests";
  if (pathname.startsWith("/friend/")) return "Profile";
  return "Liftly";
}

function AccountSettingsLink() {
  return (
    <Link
      href="/account/settings"
      className="tap-feedback rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
      aria-label="Settings"
    >
      <SettingsIcon size={20} aria-hidden />
    </Link>
  );
}

function DashboardCalendarLink() {
  return (
    <Link
      href="/calendar"
      className="tap-feedback flex h-11 w-11 items-center justify-center rounded-xl text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100 active:bg-zinc-800"
      aria-label="Open calendar"
    >
      <CalendarIcon size={20} aria-hidden />
    </Link>
  );
}

function SocialHeaderActions() {
  return (
    <>
      <Link
        href="/social/search"
        className="rounded-lg p-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100 tap-feedback"
        aria-label="Search friends"
      >
        <SearchIcon size={20} aria-hidden />
      </Link>
      <Link
        href="/social/requests"
        className="rounded-lg p-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100 tap-feedback"
        aria-label="Friend requests"
      >
        <UserPlusIcon size={20} aria-hidden />
      </Link>
    </>
  );
}

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  /** Friend profile renders its own fixed header (username + back); skip shell header to avoid double bars. */
  const isFriendProfileRoute = pathname.startsWith("/friend/");
  const showFixedHeader = !isFriendProfileRoute && pathname !== "/profile-setup";
  const hideBottomNav = pathname === "/profile-setup";

  let leftSlot: ReactNode = null;
  let rightSlot: ReactNode = null;

  const isMainTab =
    pathname === "/" ||
    pathname === "/exercises" ||
    pathname === "/insights" ||
    pathname === "/social" ||
    pathname === "/bodyweight" ||
    pathname === "/account";

  if (!isMainTab && showFixedHeader) {
    leftSlot = <BackArrowButton />;
  } else if (pathname === "/social") {
    leftSlot = <SocialInviteHeaderButton />;
  }

  if (pathname === "/") {
    rightSlot = <DashboardCalendarLink />;
  } else if (pathname === "/account") {
    rightSlot = <AccountSettingsLink />;
  } else if (pathname === "/social") {
    rightSlot = <SocialHeaderActions />;
  }

  return (
    <div
      className={`flex min-h-[100dvh] flex-col bg-zinc-950 text-zinc-100 ${
        hideBottomNav ? "pb-0" : "pb-[env(safe-area-inset-bottom)]"
      }`}
    >
      {showFixedHeader ? (
        <div className="fixed inset-x-0 top-0 z-[210] bg-zinc-950 pt-[env(safe-area-inset-top,0px)]">
          <AppHeader title={title} leftSlot={leftSlot} rightSlot={rightSlot} />
        </div>
      ) : null}
      <main
        className={`min-h-0 flex-1 ${hideBottomNav ? "pb-0" : "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-[calc(5rem+env(safe-area-inset-bottom))]"} ${showFixedHeader ? "pt-[calc(3.5rem+env(safe-area-inset-top,0px))]" : "pt-0"}`}
      >
        {children}
      </main>
      {hideBottomNav ? null : <BottomNav />}
    </div>
  );
}
