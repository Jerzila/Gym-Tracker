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
      <section className="pt-4">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Legal</p>
        <div className="space-y-3">
          <SettingsMenuRow href="/privacy" title="Privacy Policy" subtitle="How Liftly handles your data" />
          <SettingsMenuRow href="/terms" title="Terms of Service" subtitle="Rules and conditions for using Liftly" />
        </div>
      </section>
      <SettingsMenuRow href="/account/settings/other" title="Other" subtitle="Sign out" />
    </div>
  );
}
