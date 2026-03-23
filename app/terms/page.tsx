import { LegalBackButton } from "@/app/components/LegalBackButton";

export default function TermsPage() {
  return (
    <main className="min-h-screen overflow-y-auto bg-zinc-950 px-4 py-6 text-zinc-100">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <LegalBackButton />

        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Terms of Service - Liftly</h1>
          <p className="mt-2 text-sm text-zinc-400">Last updated: March 23, 2026</p>

          <div className="mt-6 space-y-5 text-sm leading-7 text-zinc-200 sm:text-[15px]">
            <p>
              By creating an account or using the Liftly app, you agree to the following terms.
            </p>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">1. Use of the App</h2>
              <p className="mt-2">
                Liftly provides tools for tracking workouts and monitoring strength progress. The app is
                intended for personal fitness tracking purposes only.
              </p>
              <p className="mt-2">
                Users are responsible for how they use training information provided by the app.
              </p>
              <p className="mt-2">
                Liftly is not responsible for injuries, health issues, or results from exercise.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">2. Accounts</h2>
              <p className="mt-2">To use Liftly, you must create an account.</p>
              <p className="mt-2">Users agree to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Provide accurate information</li>
                <li>Keep login credentials secure</li>
                <li>Not share accounts with others</li>
              </ul>
              <p className="mt-2">We reserve the right to suspend accounts that violate these terms.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">3. User Data</h2>
              <p className="mt-2">
                Workout logs, body metrics, and other data entered into Liftly belong to the user.
              </p>
              <p className="mt-2">
                By using the app, you allow Liftly to store and process this data to provide app
                functionality.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">4. Pro Subscription</h2>
              <p className="mt-2">Liftly may offer premium features through a subscription.</p>
              <p className="mt-2">
                Subscription payments are handled by the Apple App Store or Google Play.
              </p>
              <p className="mt-2">
                Subscriptions automatically renew unless canceled through the platform&apos;s subscription
                settings.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">5. Acceptable Use</h2>
              <p className="mt-2">Users may not:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Attempt to exploit or hack the app</li>
                <li>Reverse engineer the platform</li>
                <li>Use the service for illegal activity</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">6. Service Availability</h2>
              <p className="mt-2">
                We strive to keep Liftly running smoothly, but we do not guarantee uninterrupted service.
              </p>
              <p className="mt-2">Features may change or be updated at any time.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">7. Termination</h2>
              <p className="mt-2">We may suspend or terminate accounts that violate these Terms of Service.</p>
              <p className="mt-2">Users may delete their account at any time.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">8. Changes to Terms</h2>
              <p className="mt-2">
                These Terms may be updated occasionally. Continued use of the app means you accept the
                updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">9. Contact</h2>
              <p className="mt-2">
                For questions about these terms, contact:
                <br />
                yoav.schlach@icloud.com
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
