"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { buttonClass } from "@/app/components/Button";

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  }

  function handleLinkClick() {
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={-1}
        aria-label="Close menu"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 ease-out md:bg-black/50"
        style={{
          pointerEvents: isOpen ? "auto" : "none",
          opacity: isOpen ? 1 : 0,
        }}
      />
      {/* Sidebar panel: 250ms slide */}
      <aside
        aria-hidden={!isOpen}
        className="fixed left-0 top-0 z-50 h-full w-72 max-w-[calc(100vw-3rem)] bg-zinc-900 shadow-xl transition-[transform] duration-[250ms] ease-out"
        style={{
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div className="flex h-full flex-col">
          {/* App name / logo */}
          <div className="border-b border-zinc-800 px-5 py-4">
            <span className="text-lg font-semibold tracking-tight text-zinc-100">
              Gym Tracker
            </span>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/"
                  onClick={handleLinkClick}
                  className={buttonClass.sidebar(isActive("/"))}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/bodyweight"
                  onClick={handleLinkClick}
                  className={buttonClass.sidebar(isActive("/bodyweight"))}
                >
                  Bodyweight
                </Link>
              </li>
              <li>
                <Link
                  href="/calendar"
                  onClick={handleLinkClick}
                  className={buttonClass.sidebar(isActive("/calendar"))}
                >
                  Calendar
                </Link>
              </li>
            </ul>

            <div className="my-3 border-t border-zinc-800" aria-hidden />

            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/categories"
                  onClick={handleLinkClick}
                  className={buttonClass.sidebar(isActive("/categories"))}
                >
                  Manage Categories
                </Link>
              </li>
            </ul>

            <div className="my-3 border-t border-zinc-800" aria-hidden />
          </nav>

          {/* Logout at bottom */}
          <div className="border-t border-zinc-800 p-3">
            <form action={signOut}>
              <button
                type="submit"
                onClick={handleLinkClick}
                className={buttonClass.sidebar(false)}
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
