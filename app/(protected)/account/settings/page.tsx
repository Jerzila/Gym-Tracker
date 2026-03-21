import { SettingsMenuRow } from "@/app/components/SettingsMenuRow";

export default function AccountSettingsPage() {
  return (
    <div className="mx-auto max-w-xl space-y-3 px-4 pb-24 pt-2 sm:px-6">
      <SettingsMenuRow
        href="/account/edit-profile"
        title="Profile"
        subtitle="Change username · Change profile picture"
      />
      <SettingsMenuRow
        href="/account/settings/body-metrics"
        title="Body metrics"
        subtitle="Body weight · Height"
      />
      <SettingsMenuRow
        href="/account/settings/preferences"
        title="Preferences"
        subtitle="Units (kg/cm or lb/ft)"
      />
      <SettingsMenuRow
        href="/account/settings/about"
        title="About you"
        subtitle="Name · Birthday · Gender · Country"
      />
      <SettingsMenuRow
        href="/account/settings/security"
        title="Security"
        subtitle="Reset password"
      />
      <SettingsMenuRow href="/account/settings/other" title="Other" subtitle="Sign out" />
    </div>
  );
}
