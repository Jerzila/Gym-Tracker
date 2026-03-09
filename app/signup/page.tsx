import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { AppPreview } from "@/app/components/AppPreview";
import { AuthForm } from "@/app/components/AuthForm";
import { InstallBanner } from "@/app/components/InstallBanner";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center">
        <AppPreview />
        <div className="w-full space-y-8">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide text-amber-500/90 uppercase">Liftly</p>
            <p className="mt-1 text-zinc-400 text-sm text-center max-w-sm mx-auto">
              Track strength. Analyze progress. Lift smarter.
            </p>
            <p className="mt-1 text-zinc-400 text-sm text-center max-w-sm mx-auto">
              For <span className="text-amber-500">FREE</span>.
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Create account</h1>
            <p className="mt-2 text-sm text-zinc-500">Create your account</p>
          </div>

          <AuthForm action={signUp} submitLabel="Sign up" />

          <p className="text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="text-amber-500 hover:text-amber-400 transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      <InstallBanner />
    </div>
  );
}
