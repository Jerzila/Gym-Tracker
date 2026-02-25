import { ProtectedHeader } from "@/app/components/ProtectedHeader";
import { InstallBanner } from "@/app/components/InstallBanner";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <ProtectedHeader />
      {children}
      <InstallBanner />
    </div>
  );
}
