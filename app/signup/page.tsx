import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { AuthForm } from "@/app/components/AuthForm";
import { InstallBanner } from "@/app/components/InstallBanner";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Gym Tracker</h1>
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
      <InstallBanner />
    </div>
  );
}
