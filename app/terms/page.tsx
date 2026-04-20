import Link from "next/link";
import { LegalBackButton } from "@/app/components/LegalBackButton";

export default function TermsPage() {
  return (
    <main className="min-h-[100dvh] bg-zinc-950 px-4 py-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-zinc-100">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <LegalBackButton />

        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Terms of Service - Liftly</h1>
          <p className="mt-2 text-sm text-zinc-400">Last updated: April 21, 2026</p>

          <div className="mt-6 space-y-5 text-sm leading-7 text-zinc-200 sm:text-[15px]">
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of Liftly&apos;s apps, websites,
              and related services (&quot;Liftly&quot; or the &quot;Service&quot;). By creating an account or using the
              Service, you agree to these Terms and to our{" "}
              <Link href="/privacy" className="font-medium text-amber-500 underline hover:text-amber-400">
                Privacy Policy
              </Link>
              , which explains how we handle personal information.
            </p>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">1. The Service</h2>
              <p className="mt-2">
                Liftly provides tools for tracking workouts, body metrics, and strength-related progress. Some
                experiences are delivered through a website or progressive web app; native apps may display that same
                experience inside a native container. Features may differ by platform or subscription tier.
              </p>
              <p className="mt-2">
                Liftly is for personal fitness tracking and educational insight only. It is not medical advice,
                diagnosis, or treatment. Consult a qualified professional for health decisions.
              </p>
              <p className="mt-2">
                You are responsible for how you train. To the fullest extent permitted by law, Liftly and its
                operators are not liable for injuries, health issues, or outcomes related to exercise or nutrition.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">2. Eligibility and accounts</h2>
              <p className="mt-2">
                You must be old enough to form a binding contract where you live (and at least the age required by
                applicable child-privacy laws, for example 13 in the United States) to use Liftly.
              </p>
              <p className="mt-2">You agree to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Provide accurate information and keep it reasonably up to date</li>
                <li>Maintain the confidentiality of your credentials</li>
                <li>Not share your account with others or transfer it without our permission</li>
                <li>Notify us promptly if you suspect unauthorized access</li>
              </ul>
              <p className="mt-2">
                We may suspend or terminate accounts that violate these Terms, pose a security risk, or abuse the
                Service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">3. Your content and license to us</h2>
              <p className="mt-2">
                You retain ownership of content you submit (such as workout logs and profile fields). To operate
                Liftly, you grant us a worldwide, non-exclusive license to host, store, reproduce, display, and process
                your content solely to provide, secure, improve, and promote the Service, and as described in the
                Privacy Policy.
              </p>
              <p className="mt-2">
                You represent that you have the rights needed to submit your content and that it does not violate
                third-party rights or applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">4. Subscriptions, purchases, and ads</h2>
              <p className="mt-2 font-medium text-zinc-100">Paid features</p>
              <p className="mt-2">
                Liftly may offer paid subscriptions or in-app purchases (for example &quot;Pro&quot; features or options
                that remove advertising). Prices, features, and billing periods are shown at checkout or in-product
                before you buy.
              </p>
              <p className="mt-2">
                Payments are processed by third-party platforms such as the Apple App Store or Google Play, not
                directly by us. Subscription fees renew automatically until you cancel through the platform&apos;s
                subscription management. When you cancel, you typically keep access until the end of the current paid
                period.
              </p>
              <p className="mt-2">
                We use services such as RevenueCat to help validate entitlements and restore purchases. Platform refund
                rules apply; we do not control store refund decisions.
              </p>
              <p className="mt-2 font-medium text-zinc-100">Restore</p>
              <p className="mt-2">
                Where available, use the in-app &quot;Restore purchases&quot; option (or equivalent) on the same platform
                you used to buy, signed into the same store account.
              </p>
              <p className="mt-2 font-medium text-zinc-100">Advertising</p>
              <p className="mt-2">
                Supported versions may display third-party advertisements. Ad partners may collect data as described in
                our Privacy Policy and subject to your device and consent settings.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">5. Third-party services</h2>
              <p className="mt-2">
                Liftly relies on infrastructure and SDKs from third parties (including authentication, database,
                hosting, analytics, payments, and advertising). Their availability, practices, and terms may change. We
                are not responsible for third-party services beyond what the law requires.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">6. Acceptable use</h2>
              <p className="mt-2">You agree not to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Use the Service unlawfully, fraudulently, or to harass others</li>
                <li>Attempt to probe, scan, or test the vulnerability of the Service without authorization</li>
                <li>Interfere with or disrupt the Service, servers, or networks</li>
                <li>Reverse engineer, decompile, or attempt to extract source code except where laws prohibit that
                  restriction</li>
                <li>Use automated means to access the Service in a way that imposes an unreasonable load or bypasses
                  limits</li>
                <li>Misrepresent your identity or affiliation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">7. Intellectual property</h2>
              <p className="mt-2">
                Liftly&apos;s name, branding, design, and software (excluding your content) are owned by us or our
                licensors. Except for the limited rights in Section 3, these Terms do not grant you any intellectual
                property rights.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">8. Disclaimers</h2>
              <p className="mt-2">
                The Service is provided &quot;as is&quot; and &quot;as available.&quot; To the fullest extent permitted
                by law, we disclaim all warranties, whether express, implied, or statutory, including implied
                warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not
                warrant that the Service will be uninterrupted, error-free, or free of harmful components.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">9. Limitation of liability</h2>
              <p className="mt-2">
                To the fullest extent permitted by law, Liftly and its operators will not be liable for any indirect,
                incidental, special, consequential, or punitive damages, or any loss of profits, data, goodwill, or
                business opportunities, arising from your use of the Service.
              </p>
              <p className="mt-2">
                To the fullest extent permitted by law, our aggregate liability for any claim arising out of or related
                to the Service will not exceed the greater of (a) the amount you paid us for the Service in the twelve
                months before the event giving rise to liability, or (b) fifty US dollars (USD 50), if you have not
                paid us.
              </p>
              <p className="mt-2">
                Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the
                maximum permitted by law. Mandatory consumer rights in your country may apply regardless of the above.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">10. Indemnity</h2>
              <p className="mt-2">
                To the extent permitted by law, you will defend and indemnify Liftly and its operators against claims,
                damages, losses, and expenses (including reasonable legal fees) arising from your content, your misuse of
                the Service, or your violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">11. Termination</h2>
              <p className="mt-2">
                You may stop using Liftly at any time. You may delete your account using the in-app account deletion
                feature where available. We may suspend or terminate access if you materially breach these Terms or if we
                discontinue the Service where permitted by law.
              </p>
              <p className="mt-2">
                Provisions that by their nature should survive (including Sections 3, 5, 7–11, and 13) will survive
                termination.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">12. Changes to the Service or Terms</h2>
              <p className="mt-2">
                We may modify the Service or these Terms. If we make material changes to the Terms, we will provide
                notice as appropriate (for example by posting an updated date or in-app notice). Continued use after the
                effective date constitutes acceptance unless the law requires a different process.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">13. General</h2>
              <p className="mt-2">
                If a provision is unenforceable, the remaining provisions remain in effect. Failure to enforce a
                provision is not a waiver. These Terms are the entire agreement between you and us regarding Liftly
                and supersede prior understandings on the same subject.
              </p>
              <p className="mt-2">
                Nothing in these Terms limits rights you may have under mandatory consumer protection laws in your
                country of residence.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-100">14. Contact</h2>
              <p className="mt-2">
                Questions about these Terms:{" "}
                <a
                  href="mailto:support@liftlygym.com?subject=Terms%20of%20Service%20inquiry"
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
