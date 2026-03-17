"use client";

import { InstallPromptModal } from "@/app/components/InstallPromptModal";

export function InstallPromptProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <InstallPromptModal />
    </>
  );
}
