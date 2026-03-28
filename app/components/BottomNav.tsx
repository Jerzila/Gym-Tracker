"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartIcon, HomeIcon, StrengthIcon, TrophyIcon, UserIcon } from "@/components/icons";

type NavItem = {
  href: string;
  label: string;
  Icon: (props: { size?: number; className?: string; "aria-hidden"?: boolean }) => React.JSX.Element;
};

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", Icon: HomeIcon },
  { href: "/exercises", label: "Exercises", Icon: StrengthIcon },
  { href: "/insights", label: "Insights", Icon: ChartIcon },
  { href: "/social", label: "Social", Icon: TrophyIcon },
  { href: "/account", label: "Account", Icon: UserIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      aria-label="Main navigation"
    >
      <div
        className="pointer-events-auto flex h-[3.25rem] w-full max-w-md items-center justify-between gap-0.5 rounded-full bg-[#222222] px-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.06]"
      >
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className="tap-feedback relative flex min-h-[2.75rem] min-w-0 flex-1 items-center justify-center rounded-full py-1 transition-transform active:scale-[0.96]"
            >
              <span
                className={[
                  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                  active ? "bg-amber-500" : "bg-transparent",
                ].join(" ")}
              >
                <Icon
                  size={20}
                  aria-hidden
                  className={active ? "text-zinc-950" : "text-zinc-500"}
                />
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
