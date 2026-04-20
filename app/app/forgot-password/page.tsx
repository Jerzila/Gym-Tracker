import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { AppPreview } from "@/app/components/AppPreview";
import { ForgotPasswordForm } from "@/app/components/ForgotPasswordForm";
import { InstallBanner } from "@/app/components/InstallBanner";
import { appHref } from "@/lib/appRoutes";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center">
        <AppPreview />
        <div className="w-full space-y-8">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide text-amber-500/90 uppercase">Liftly</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Forgot password?</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          <ForgotPasswordForm action={requestPasswordReset} />

          <p className="text-center text-sm text-zinc-500">
            Remember your password?{" "}
            <Link href={appHref("/login")} className="text-amber-500 hover:text-amber-400 transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      <InstallBanner />
    </div>
  );
}
