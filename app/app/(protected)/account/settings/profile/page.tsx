import { redirect } from "next/navigation";
import { appHref } from "@/lib/appRoutes";

/** Profile editing lives at /account/edit-profile (not nested under Settings navigation). */
export default function SettingsProfileRedirectPage() {
  redirect(appHref("/account/edit-profile"));
}
