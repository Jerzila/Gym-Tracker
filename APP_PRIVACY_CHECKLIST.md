# App Store Connect — App Privacy alignment (Liftly)

Use this when filling **App Privacy** in App Store Connect. Answers must match **actual behavior** and your in-app **Privacy Policy** (`/privacy`). If Apple’s definitions differ from yours, follow Apple’s questionnaire wording.

## Data types to consider declaring

| Area | Typical Apple categories | Notes |
|------|-------------------------|--------|
| **Supabase** | Contact Info (email), Name, User ID, Other User Content (workouts, metrics, profile fields), Authentication credentials (handled by provider) | Linked to user for app functionality. |
| **RevenueCat** | Purchase History, User ID | Used to verify subscriptions / entitlements; linked to user. |
| **Vercel Analytics** | Product Interaction, Performance Data, Device ID (if applicable per Vercel’s current disclosure) | Confirm current Vercel Analytics data categories in their docs and your dashboard settings. |
| **Google AdMob (native)** | Advertising Data, Device ID, Usage Data, **Tracking** (if you use tracking APIs or cross-app tracking) | You request ATT on iOS and run UMP consent; declare tracking only if your implementation meets Apple’s definition. |
| **Crash / diagnostics** | Diagnostics | Only if you attach a crash reporter that collects this; add rows if you enable one later. |

## Per-SDK quick reference

1. **Supabase** — Auth + database: account, profile (name, birthday, gender, country, units), workouts, body metrics, rankings. Review: https://supabase.com/privacy  
2. **RevenueCat** — Subscriber ID tied to your user id; purchase state. Review: https://www.revenuecat.com/privacy  
3. **Vercel + Vercel Analytics** — Hosting; product/usage analytics as configured. Review: https://vercel.com/legal/privacy-policy  
4. **Google Mobile Ads / AdMob / UMP** — Ads, consent, identifiers as allowed. Review Google’s App Privacy guidance for their SDK version you ship.

## Before you submit

- [ ] Walk the app on a **clean install** and note every permission prompt (ATT, notifications if any, etc.).
- [ ] Complete **App Privacy** with the same story as `/privacy` and `/terms`.
- [ ] **Privacy Policy URL** in App Store Connect points to your live `https://…/privacy`.
- [ ] If you offer subscriptions: **Paid Applications Agreement**, tax/banking, subscription screenshots, and **review notes** (sandbox tester, where to tap for paywall / restore).

This file is operational guidance only, not legal advice.
