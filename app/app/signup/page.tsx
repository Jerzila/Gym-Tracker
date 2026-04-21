import Link from "next/link";
import Image from "next/image";
import { signUp } from "@/app/actions/auth";
import { AuthForm } from "@/app/components/AuthForm";
import { appHref } from "@/lib/appRoutes";

const previewScreens = [
  { src: "/iphonemockup1.PNG", alt: "Liftly iPhone mockup 1" },
  { src: "/iphonemockup2.PNG", alt: "Liftly iPhone mockup 2" },
  { src: "/iphonemockup3.PNG", alt: "Liftly iPhone mockup 3" },
];

function SignupScreenshots() {
  return (
    <div className="relative w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-x-6 top-1/2 h-16 -translate-y-1/2 rounded-full bg-amber-500/10 blur-2xl" />
      <div className="relative grid grid-cols-3 place-items-center gap-1">
        {previewScreens.map((screen) => (
          <div
            key={screen.src}
            className="relative w-[74px] aspect-[9/19.5] overflow-hidden rounded-[18px] shadow-[0_18px_42px_rgba(0,0,0,0.55)] sm:w-[80px]"
          >
            <Image
              src={screen.src}
              alt={screen.alt}
              fill
              className="object-contain"
              sizes="80px"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 px-4 py-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-zinc-100">
      <div className="w-full max-w-sm flex flex-col items-center">
        <SignupScreenshots />
        <div className="mt-2.5 w-full space-y-4">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide text-amber-500/90 uppercase">Liftly</p>
            <p className="mt-1 text-zinc-100 text-base font-semibold tracking-tight">Track every lift.</p>
            <p className="mt-1 text-zinc-400 text-sm">See real strength progress.</p>
            <p className="mt-1 text-amber-500 text-sm font-semibold">Start free.</p>
            <h1 className="mt-3 text-lg font-semibold tracking-tight">Create your account</h1>
            <p className="mt-1 text-xs text-[rgba(255,255,255,0.55)]">
              Built for lifters serious about progress.
            </p>
          </div>

          <AuthForm action={signUp} submitLabel="Create free account" requireLegalAgreement />

          <p className="text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href={appHref("/login")} className="text-amber-500 hover:text-amber-400 transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
