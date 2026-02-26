import { getCategories } from "@/app/actions/categories";
import { ProtectedShell } from "@/app/components/ProtectedShell";
import { InstallBanner } from "@/app/components/InstallBanner";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategories();
  return (
    <>
      <ProtectedShell categories={categories}>
        {children}
      </ProtectedShell>
      <InstallBanner />
    </>
  );
}
