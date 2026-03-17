import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { AppPreview } from "@/app/components/AppPreview";
import { AuthForm } from "@/app/components/AuthForm";
import { InstallBanner } from "@/app/components/InstallBanner";

type Props = { searchParams: Promise<{ redirect?: string; message?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { redirect: redirectTo, message } = await searchParams;
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center">
        <AppPreview />
        <div className="w-full space-y-8">
          {message === "password-updated" && (
            <p className="rounded-lg bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300 text-center">
              Your password has been successfully updated.
            </p>
          )}
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide text-amber-500/90 uppercase">Liftly</p>
            <p className="mt-1 text-zinc-400 text-sm text-center max-w-sm mx-auto">
              Track strength. Analyze progress. Lift smarter.
            </p>
            <p className="mt-1 text-zinc-400 text-sm text-center max-w-sm mx-auto">
              For <span className="text-amber-500">FREE</span>.
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-2 text-sm text-zinc-500">Sign in to your account</p>
          </div>

          <AuthForm action={signIn} submitLabel="Sign in" redirectTo={redirectTo} />

          <p className="text-center text-sm">
            <Link href="/forgot-password" className="text-amber-500 hover:text-amber-400 transition">
              Forgot password?
            </Link>
          </p>

          <p className="text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-amber-500 hover:text-amber-400 transition">
              Sign up
            </Link>
          </p>
        </div>
      </div>
      <InstallBanner />
    </div>
  );
}
