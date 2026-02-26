"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/app/components/AppHeader";
import { Sidebar } from "@/app/components/Sidebar";
import type { Category } from "@/lib/types";

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  if (pathname === "/bodyweight") return "Bodyweight";
  if (pathname === "/categories") return "Categories";
  if (pathname.startsWith("/exercise/")) return "Exercise";
  return "Gym Tracker";
}

export function ProtectedShell({
  categories,
  children,
}: {
  categories: Category[];
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (sidebarOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <AppHeader title={title} onMenuClick={() => setSidebarOpen(true)} />
      <Suspense fallback={null}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </Suspense>
      <main>{children}</main>
    </div>
  );
}
