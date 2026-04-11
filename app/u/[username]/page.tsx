import { createServerClient } from "@/lib/supabase/server";
import { normalizeUsernameInput } from "@/lib/username";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ username: string }> };

/** Public entry: invite link by username — no invite state persisted. */
export default async function UsernameInviteEntryPage({ params }: Props) {
  const { username: usernameParam } = await params;
  const handle = normalizeUsernameInput(decodeURIComponent(String(usernameParam ?? "")));
  if (!handle) {
    redirect("/");
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const resume = `/u/${encodeURIComponent(handle)}`;
    redirect(`/login?redirect=${encodeURIComponent(resume)}`);
  }

  const { data: profile } = await supabase.from("profiles").select("id").eq("username", handle).maybeSingle();

  if (!profile?.id) {
    redirect("/");
  }

  const id = String(profile.id);
  if (user.id === id) {
    redirect("/account/edit-profile");
  }

  redirect(`/friend/${encodeURIComponent(id)}`);
}
