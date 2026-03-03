import { getCategories } from "@/app/actions/categories";
import { ProtectedShell } from "@/app/components/ProtectedShell";
import { InstallBanner } from "@/app/components/InstallBanner";
import { ToastProvider } from "@/app/components/Toast";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategories();
  return (
    <>
      <ToastProvider>
        <ProtectedShell categories={categories}>
          {children}
        </ProtectedShell>
      </ToastProvider>
      <InstallBanner />
    </>
  );
}
