import { LegalBackButton } from "@/app/components/LegalBackButton";

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-zinc-950 px-4 py-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-zinc-100">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <LegalBackButton />

        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Privacy Policy - Liftly</h1>
          <p className="mt-2 text-sm text-zinc-400">Last updated: April 21, 2026</p>

          <div className="mt-6 space-y-5 text-sm leading-7 text-zinc-200 sm:text-[15px]">
            <p>
              Liftly (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides a fitness tracking experience for logging
              workouts, body metrics, and related progress. This Privacy Policy describes what information we collect,
              why we collect it, who we share it with, and the choices you have. It applies to the Liftly website,
              progressive web app, and native apps (including versions that load our web experience inside a native
              shell).
            </p>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">1. Who is responsible</h2>
              <p className="mt-2">
                Liftly is operated by the project owner reachable at the contact email in Section 12. We act as the
                data controller for personal information we determine the purposes and means of processing, except where
                a service provider processes data solely on our instructions (see Section 5).
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">2. Information we collect</h2>
              <p className="mt-2">Depending on how you use Liftly, we may process:</p>

              <p className="mt-3 font-medium text-zinc-100">Account and authentication</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>Email address and password (or credentials you use with our authentication provider)</li>
                <li>Username or display name</li>
                <li>Session tokens stored in cookies or similar storage to keep you signed in</li>
              </ul>

              <p className="mt-3 font-medium text-zinc-100">Profile and preferences</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>Name, birthday, gender, country (if you choose to provide them)</li>
                <li>Unit preferences (for example metric or imperial)</li>
              </ul>

              <p className="mt-3 font-medium text-zinc-100">Fitness and health-related data you enter</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>Workout logs, exercises, sets, reps, weights, and related training notes you save</li>
                <li>Body weight, height, and other body metrics you log</li>
                <li>Progress, rankings, or analytics derived from the information above</li>
              </ul>

              <p className="mt-3 font-medium text-zinc-100">Purchases and entitlements</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>
                  A stable app user identifier linked to your account so subscription and purchase status (for example
                  &quot;Pro&quot; or ad removal) can be verified across devices
                </li>
                <li>We do not receive your full payment card details; mobile stores and our purchase partner process
                  payments</li>
              </ul>

              <p className="mt-3 font-medium text-zinc-100">Advertising, measurement, and consent (native apps)</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>
                  On supported native builds, we use Google&apos;s advertising stack (for example Google Mobile Ads) to
                  show ads. That may involve device and ad interaction data, and where permitted, advertising or device
                  identifiers
                </li>
                <li>
                  Where required or offered by the platform, we request permission to use tracking across other
                  companies&apos; apps and websites (for example Apple&apos;s App Tracking Transparency on iOS), and we
                  may show consent or preference flows (such as Google&apos;s User Messaging Platform) before or in
                  connection with personalized ads
                </li>
              </ul>

              <p className="mt-3 font-medium text-zinc-100">Product and hosting analytics</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>
                  Usage and performance metrics to understand how the service is used and to improve reliability (for
                  example through Vercel Analytics when you use our hosted site or app)
                </li>
              </ul>

              <p className="mt-3 font-medium text-zinc-100">Technical and security data</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>IP address, browser or app version, device type, timestamps, and diagnostic data typical for web
                  and mobile services</li>
                <li>Information you send when you contact support</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">3. How we use information</h2>
              <p className="mt-2">We use personal information to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Create and secure your account, reset access when you ask, and provide core app features</li>
                <li>Store, sync, and display your workouts, metrics, and progress</li>
                <li>Validate subscriptions or one-time purchases and restore access when you use restore flows</li>
                <li>Deliver and measure advertising on supported native builds, subject to your choices and platform
                  rules</li>
                <li>Operate, maintain, secure, debug, and improve Liftly</li>
                <li>Comply with law, respond to lawful requests, and enforce our Terms of Service</li>
              </ul>
              <p className="mt-2">
                We do not sell your personal information for money. We may allow advertising partners to use identifiers
                as described in their policies and in accordance with your consent or device settings where
                applicable.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">4. Legal bases (EEA, UK, and similar regions)</h2>
              <p className="mt-2">
                Where laws such as the GDPR apply, we rely on appropriate bases including: performance of a contract
                (providing Liftly); legitimate interests (security, product improvement, and non-intrusive analytics,
                balanced against your rights); consent where required (for example certain marketing or tracking
                choices presented in the app or system); and legal obligations.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">5. Service providers and categories of recipients</h2>
              <p className="mt-2">
                We use trusted third parties who process information on our behalf or joint controllers in limited
                cases. They are contractually or legally required to protect data and use it only for the services they
                provide. Categories include:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <strong>Supabase</strong> (authentication, database, and related infrastructure) — see Supabase&apos;s
                  privacy documentation at https://supabase.com/privacy
                </li>
                <li>
                  <strong>Hosting and analytics</strong> (for example Vercel for hosting and Vercel Analytics) — see
                  https://vercel.com/legal/privacy-policy
                </li>
                <li>
                  <strong>RevenueCat</strong> (subscription status, restore, and purchase tooling on native platforms) —
                  see https://www.revenuecat.com/privacy
                </li>
                <li>
                  <strong>Google advertising and measurement</strong> (AdMob and related services on supported native
                  builds) — see Google&apos;s privacy resources for ads, including choices where available
                </li>
              </ul>
              <p className="mt-2">
                Providers may process data in the United States and other countries. Where required, we use appropriate
                safeguards such as standard contractual clauses or equivalent mechanisms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">6. Retention and deletion</h2>
              <p className="mt-2">
                We keep information for as long as your account exists and as needed to provide the service, comply with
                law, resolve disputes, and enforce agreements. When you delete your account through the in-app account
                deletion flow, we delete or anonymize personal data associated with your account in line with our
                technical capabilities and legal obligations. Some residual copies or backups may persist for a limited
                period before automatic erasure.
              </p>
              <p className="mt-2">
                Third parties such as Apple, Google, or RevenueCat may retain certain transaction or fraud-prevention
                records according to their own policies.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">7. Your choices and rights</h2>
              <p className="mt-2">Depending on where you live, you may have the right to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Access, correct, or delete certain personal information</li>
                <li>Object to or restrict certain processing, or withdraw consent where processing is consent-based</li>
                <li>Port data you provided in a structured, machine-readable format where technically feasible</li>
                <li>Lodge a complaint with a supervisory authority</li>
              </ul>
              <p className="mt-2">
                You can update much of your information in the app. For other requests, contact us using Section 12. You
                can also use platform controls (for example Apple or Google subscription settings, device advertising
                preferences, or tracking permissions) to limit certain uses.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">8. California residents (summary)</h2>
              <p className="mt-2">
                If the California Consumer Privacy Act (CCPA) or California Privacy Rights Act (CPRA) applies, you have
                rights to know, delete, and correct personal information, and to opt out of &quot;sale&quot; or
                &quot;sharing&quot; as defined by California law. We do not knowingly sell personal information of
                minors under 16. To exercise rights, email us at the address below. We will not discriminate against you
                for exercising these rights.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">9. Security</h2>
              <p className="mt-2">
                We use administrative, technical, and organizational measures appropriate to the risk. No method of
                transmission or storage is completely secure; we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">10. Children</h2>
              <p className="mt-2">
                Liftly is not directed to children under 13 (or the minimum age required in your jurisdiction). We do
                not knowingly collect personal information from children. If you believe we have, contact us and we will
                take appropriate steps to delete it.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">11. Changes</h2>
              <p className="mt-2">
                We may update this Privacy Policy from time to time. We will post the updated version in the app and
                update the &quot;Last updated&quot; date. Material changes may require additional notice where the law
                says so.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">12. Contact</h2>
              <p className="mt-2">
                Questions about this Privacy Policy:{" "}
                <a
                  href="mailto:support@liftlygym.com?subject=Privacy%20policy%20inquiry"
                  className="font-medium text-amber-400/95 underline decoration-amber-400/35 underline-offset-2 transition-colors hover:text-amber-300 hover:decoration-amber-400/55"
                >
                  support@liftlygym.com
                </a>
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
