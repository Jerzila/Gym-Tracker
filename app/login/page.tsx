import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { AuthForm } from "@/app/components/AuthForm";
import { InstallBanner } from "@/app/components/InstallBanner";

type Props = { searchParams: Promise<{ redirect?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { redirect: redirectTo } = await searchParams;
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Gym Tracker</h1>
          <p className="mt-2 text-sm text-zinc-500">Sign in to your account</p>
        </div>

        <AuthForm action={signIn} submitLabel="Sign in" redirectTo={redirectTo} />

        <p className="text-center text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-amber-500 hover:text-amber-400 transition">
            Sign up
          </Link>
        </p>
      </div>
      <InstallBanner />
    </div>
  );
}
