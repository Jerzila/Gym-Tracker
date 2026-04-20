import Link from "next/link";
import Image from "next/image";
import { signIn } from "@/app/actions/auth";
import { AuthForm } from "@/app/components/AuthForm";
import { InstallBanner } from "@/app/components/InstallBanner";
import { appHref } from "@/lib/appRoutes";

const previewScreens = [
  { src: "/IMG_2669.PNG", alt: "Liftly workout tracking preview", objectPosition: "50% 76%" },
  { src: "/IMG_2670.PNG", alt: "Liftly progress view preview", objectPosition: "50% 31%" },
  { src: "/dashboard-preview.PNG", alt: "Liftly dashboard preview", objectPosition: "50% 50%" },
];

type Props = { searchParams: Promise<{ redirect?: string; message?: string }> };

function SigninScreenshots() {
  return (
    <div className="relative w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-x-8 top-1/2 h-14 -translate-y-1/2 rounded-full bg-amber-500/5 blur-2xl" />
      <div className="relative grid grid-cols-3 gap-1">
        {previewScreens.map((screen) => (
          <div
            key={screen.src}
            className="relative h-[128px] overflow-hidden rounded-xl border border-white/10 bg-zinc-900 opacity-85 shadow-[0_14px_38px_rgba(255,170,0,0.1)]"
          >
            <Image
              src={screen.src}
              alt={screen.alt}
              fill
              className="object-cover"
              style={{ objectPosition: screen.objectPosition }}
              sizes="(max-width: 640px) 30vw, 108px"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function LoginPage({ searchParams }: Props) {
  const { redirect: redirectTo, message } = await searchParams;
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 px-4 py-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-zinc-100">
      <div className="w-full max-w-sm flex flex-col items-center">
        <SigninScreenshots />
        <div className="w-full space-y-3.5 mt-3">
          {message === "password-updated" && (
            <p className="rounded-lg bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300 text-center">
              Your password has been successfully updated.
            </p>
          )}
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide text-amber-500/90 uppercase">Liftly</p>
            <p className="mt-1 text-zinc-100 text-base font-semibold tracking-tight">Welcome back.</p>
            <p className="mt-1 text-zinc-400 text-sm">Sign in to continue tracking your progress.</p>
            <h1 className="mt-3 text-lg font-semibold tracking-tight">Sign in to your account</h1>
          </div>

          <AuthForm action={signIn} submitLabel="Sign in" redirectTo={redirectTo} />

          <p className="text-center">
            <Link
              href={appHref("/forgot-password")}
              className="text-sm text-amber-500 hover:underline decoration-amber-400 underline-offset-2 transition"
            >
              Forgot password?
            </Link>
          </p>

          <p className="text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link href={appHref("/signup")} className="text-amber-500 hover:text-amber-400 transition">
              Create free account
            </Link>
          </p>
        </div>
      </div>
      <InstallBanner />
    </div>
  );
}
