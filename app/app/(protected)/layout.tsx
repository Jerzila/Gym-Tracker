import { ProtectedShell } from "@/app/components/ProtectedShell";
import { createServerClient } from "@/lib/supabase/server";
import { appHref } from "@/lib/appRoutes";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(appHref("/signup"));
  }

  return <ProtectedShell>{children}</ProtectedShell>;
}
