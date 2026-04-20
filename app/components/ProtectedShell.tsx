"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/app/components/AppHeader";
import { BottomNav } from "@/app/components/BottomNav";
import { CalendarIcon, SearchIcon, SettingsIcon, UserPlusIcon } from "@/components/icons";
import { BackArrowButton } from "@/app/components/BackArrowButton";
import { SocialInviteHeaderButton } from "@/app/components/SocialInviteHeaderButton";
import { DashboardGetProButton } from "@/app/components/DashboardGetProButton";
import {
  FriendIncomingRequestsProvider,
  PendingFriendRequestBadge,
  useFriendIncomingRequests,
} from "@/app/components/FriendIncomingRequestsContext";
import { APP_HOME, appHref, stripAppPathPrefix } from "@/lib/appRoutes";

function getPageTitle(pathname: string): string {
  const p = stripAppPathPrefix(pathname);
  if (p === "/profile-setup") return "Complete Your Profile";
  if (p === "/") return "Dashboard";
  if (p === "/exercises") return "Exercises";
  if (p === "/calendar") return "Calendar";
  if (p === "/insights") return "Insights";
  if (p === "/insights/strength-progress") return "Insights";
  if (p === "/insights/strength-compare") return "Compare strength";
  if (p === "/social") return "Social";
  if (p === "/bodyweight") return "Bodyweight";
  if (p === "/account") return "Account";
  if (p === "/account/settings") return "Settings";
  if (p === "/account/edit-profile") return "Edit Profile";
  if (p === "/account/settings/body-metrics") return "Body metrics";
  if (p === "/account/settings/preferences") return "Preferences";
  if (p === "/account/settings/about") return "About you";
  if (p === "/account/settings/security") return "Security";
  if (p === "/account/settings/other") return "Other";
  if (p === "/categories") return "Categories";
  if (p.startsWith("/exercise/")) return "Exercise";
  if (p === "/social/search") return "Search Friends";
  if (p === "/social/requests") return "Friend Requests";
  if (p.startsWith("/friend/")) return "Profile";
  return "Liftly";
}

function AccountSettingsLink() {
  return (
    <Link
      href={appHref("/account/settings")}
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
      href={appHref("/calendar")}
      className="tap-feedback flex h-11 w-11 items-center justify-center rounded-xl text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100 active:bg-zinc-800"
      aria-label="Open calendar"
    >
      <CalendarIcon size={20} aria-hidden />
    </Link>
  );
}

function SocialHeaderActions() {
  const { pendingCount } = useFriendIncomingRequests();
  const requestsLabel =
    pendingCount > 0
      ? `Friend requests, ${pendingCount} pending`
      : "Friend requests";

  return (
    <>
      <Link
        href={appHref("/social/search")}
        className="rounded-lg p-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100 tap-feedback"
        aria-label="Search friends"
      >
        <SearchIcon size={20} aria-hidden />
      </Link>
      <Link
        href={appHref("/social/requests")}
        className="relative rounded-lg p-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100 tap-feedback"
        aria-label={requestsLabel}
      >
        <UserPlusIcon size={20} aria-hidden />
        <PendingFriendRequestBadge count={pendingCount} />
      </Link>
    </>
  );
}

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const p = stripAppPathPrefix(pathname);

  /** Friend profile renders its own fixed header (username + back); skip shell header to avoid double bars. */
  const isFriendProfileRoute = p.startsWith("/friend/");
  const showFixedHeader = !isFriendProfileRoute && p !== "/profile-setup";
  const hideBottomNav = p === "/profile-setup";

  let leftSlot: ReactNode = null;
  let rightSlot: ReactNode = null;

  const isMainTab =
    p === "/" ||
    p === "/exercises" ||
    p === "/insights" ||
    p === "/social" ||
    p === "/bodyweight" ||
    p === "/account" ||
    p === "/calendar" ||
    pathname === APP_HOME;

  if (!isMainTab && showFixedHeader) {
    leftSlot = <BackArrowButton />;
  } else if (p === "/social") {
    leftSlot = <SocialInviteHeaderButton />;
  } else if (p === "/" || pathname === APP_HOME) {
    leftSlot = <DashboardGetProButton />;
  }

  if (p === "/" || pathname === APP_HOME) {
    rightSlot = <DashboardCalendarLink />;
  } else if (p === "/account") {
    rightSlot = <AccountSettingsLink />;
  } else if (p === "/social") {
    rightSlot = <SocialHeaderActions />;
  }

  return (
    <FriendIncomingRequestsProvider>
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
    </FriendIncomingRequestsProvider>
  );
}
