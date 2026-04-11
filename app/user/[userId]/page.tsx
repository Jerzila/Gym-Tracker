import { createServerClient } from "@/lib/supabase/server";
import { isUuidLike, normalizeUsernameInput } from "@/lib/username";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ userId: string }> };

/** Public entry: invite link by user id — no invite state persisted. */
export default async function UserInviteEntryPage({ params }: Props) {
  const { userId } = await params;
  const raw = decodeURIComponent(String(userId ?? "").trim());

  if (!isUuidLike(raw)) {
    const handle = normalizeUsernameInput(raw);
    if (handle) {
      redirect(`/u/${encodeURIComponent(handle)}`);
    }
    redirect("/");
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resume = `/user/${encodeURIComponent(raw)}`;
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(resume)}`);
  }

  if (user.id === raw) {
    redirect("/account/edit-profile");
  }

  redirect(`/friend/${encodeURIComponent(raw)}`);
}
