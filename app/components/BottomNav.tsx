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
    <nav className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/10 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto grid h-20 max-w-3xl grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)]">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={[
                "flex h-20 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-medium transition-colors",
                active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              <Icon size={22} aria-hidden className={active ? "text-zinc-100" : "text-zinc-500"} />
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
