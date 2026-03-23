"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { updateUsername } from "@/app/actions/profile";
import { UserAvatar } from "@/app/components/UserAvatar";
import { buttonClass } from "@/app/components/Button";
import { useToast } from "@/app/components/Toast";
import { useUsernameDisplay } from "@/app/components/UsernameDisplayContext";
import {
  getUsernameChangeCooldownState,
  normalizeUsernameInput,
  USERNAME_CHANGE_COOLDOWN_ERROR_MESSAGE,
  validateUsernameFormat,
} from "@/lib/username";
import type { Profile } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

export function SettingsProfileForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const { show: showToast } = useToast();
  const usernameDisplay = useUsernameDisplay();

  const [usernameDraft, setUsernameDraft] = useState(profile?.username ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setUsernameDraft(profile?.username ?? "");
    });
    return () => cancelAnimationFrame(raf);
  }, [profile?.id, profile?.username, profile?.username_last_changed_at, profile?.updated_at]);

  const usernameCooldown = profile
    ? getUsernameChangeCooldownState(profile.username_last_changed_at)
    : { canChange: true, daysRemaining: null as number | null };

  const usernameDirty =
    !!profile && normalizeUsernameInput(usernameDraft) !== (profile.username ?? "");
  const dirty = usernameDirty;
  const usernameBlocked =
    usernameDirty && !usernameCooldown.canChange;

  const save = useCallback(() => {
    if (!profile || !dirty) return;
    setFormError(null);

    if (usernameDirty) {
      const fmt = validateUsernameFormat(usernameDraft);
      if (fmt) {
        setFormError(fmt);
        return;
      }
      const cd = getUsernameChangeCooldownState(profile.username_last_changed_at);
      if (!cd.canChange) {
        setFormError(USERNAME_CHANGE_COOLDOWN_ERROR_MESSAGE);
        showToast(USERNAME_CHANGE_COOLDOWN_ERROR_MESSAGE, { variant: "error" });
        return;
      }
    }

    startTransition(async () => {
      try {
        if (usernameDirty) {
          const res = await updateUsername(usernameDraft);
          if (res.error) {
            setFormError(res.error);
            showToast(res.error, { variant: "error" });
            return;
          }
          const next = normalizeUsernameInput(usernameDraft);
          usernameDisplay?.setUsername(next);
          showToast("Username changed successfully.");
        }

        router.refresh();
      } catch (error) {
        console.error("Profile update failed:", error);
        const message = "Failed to save profile";
        setFormError(message);
        showToast(message, { variant: "error" });
      }
    });
  }, [
    dirty,
    profile,
    router,
    showToast,
    usernameDisplay,
    usernameDraft,
    usernameDirty,
  ]);

  if (!profile) {
    return <p className="text-sm text-zinc-400">Loading profile…</p>;
  }

  return (
    <div className="flex min-h-[60vh] flex-col px-1 pb-8 pt-2">
      <div className="flex flex-1 flex-col gap-10">
        <div className="flex flex-col items-center">
          <UserAvatar profile={profile ? { username: usernameDraft || profile.username } : null} size={96} />
        </div>

        <div>
          <label htmlFor="settings-profile-username" className="mb-2 block text-sm font-medium text-zinc-400">
            Username
          </label>
          <p className="mb-2 text-xs text-zinc-500">
            Shown as @username. Letters, numbers, and underscores (3–20 characters).
          </p>
          <p className="mb-3 text-xs text-zinc-500">You can change your username once every 7 days.</p>
          <input
            id="settings-profile-username"
            type="text"
            autoComplete="username"
            className={inputClass}
            value={usernameDraft}
            onChange={(e) => {
              setUsernameDraft(e.target.value.toLowerCase());
              setFormError(null);
            }}
            maxLength={20}
          />
          {!usernameCooldown.canChange && usernameCooldown.daysRemaining != null && (
            <p className="mt-2 text-xs text-zinc-500">
              You can change your username again in {usernameCooldown.daysRemaining}{" "}
              {usernameCooldown.daysRemaining === 1 ? "day" : "days"}.
            </p>
          )}
          <p className="mt-4 text-xs text-zinc-500">
            Social features are coming soon. Stay tuned.
          </p>
        </div>

        {formError && (
          <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{formError}</p>
        )}
      </div>

      <div className="mt-auto border-t border-zinc-800 pt-6">
        <button
          type="button"
          className={`${buttonClass.primary} w-full`}
          disabled={!dirty || pending || usernameBlocked}
          onClick={save}
        >
          {pending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
