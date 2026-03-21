import { redirect } from "next/navigation";

/** Profile editing lives at /account/edit-profile (not nested under Settings navigation). */
export default function SettingsProfileRedirectPage() {
  redirect("/account/edit-profile");
}
