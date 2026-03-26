import { LegalBackButton } from "@/app/components/LegalBackButton";

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-zinc-950 px-4 py-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-zinc-100">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <LegalBackButton />

        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Privacy Policy - Liftly</h1>
          <p className="mt-2 text-sm text-zinc-400">Last updated: March 23, 2026</p>

          <div className="mt-6 space-y-5 text-sm leading-7 text-zinc-200 sm:text-[15px]">
            <p>
              Liftly (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides a fitness tracking platform that allows users to
              log workouts, track strength progress, and analyze training data. This Privacy Policy
              explains how we collect, use, and protect your information when you use the Liftly app.
            </p>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">1. Information We Collect</h2>
              <p className="mt-2">When you use Liftly, we may collect the following information:</p>
              <p className="mt-3 font-medium text-zinc-100">Account Information</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>Email address</li>
                <li>Username or display name</li>
              </ul>
              <p className="mt-3 font-medium text-zinc-100">Fitness Data</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>Workout logs</li>
                <li>Exercises performed</li>
                <li>Sets, reps, and weights</li>
                <li>Strength rankings and progress</li>
              </ul>
              <p className="mt-3 font-medium text-zinc-100">Body Metrics</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>Body weight</li>
                <li>Height</li>
                <li>Other fitness metrics you choose to log</li>
              </ul>
              <p className="mt-3 font-medium text-zinc-100">Technical Information</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>Device type</li>
                <li>App usage data</li>
                <li>Basic analytics used to improve the app</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">2. How We Use Your Information</h2>
              <p className="mt-2">We use your information to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Provide workout tracking and strength ranking features</li>
                <li>Store and display your training progress</li>
                <li>Improve the Liftly app and its features</li>
                <li>Maintain account security</li>
                <li>Provide customer support if needed</li>
              </ul>
              <p className="mt-2">We do not sell your personal data.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">3. Data Storage</h2>
              <p className="mt-2">
                Your data is securely stored on our servers. We take reasonable measures to protect
                user information from unauthorized access.
              </p>
              <p className="mt-2">However, no online system can guarantee absolute security.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">4. Sharing of Information</h2>
              <p className="mt-2">We do not sell or rent personal information.</p>
              <p className="mt-2">Information may only be shared:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>With infrastructure providers required to operate the app</li>
                <li>If required by law or legal request</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">5. User Control</h2>
              <p className="mt-2">You control your data. Users can:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Update their profile information</li>
                <li>Edit workout logs</li>
                <li>Delete their account and associated data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">6. Children&apos;s Privacy</h2>
              <p className="mt-2">
                Liftly is not intended for children under the age of 13. We do not knowingly collect
                personal data from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">7. Changes to This Policy</h2>
              <p className="mt-2">
                We may update this Privacy Policy from time to time. Changes will be posted in the app.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">8. Contact</h2>
              <p className="mt-2">
                If you have questions about this Privacy Policy, contact:
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
