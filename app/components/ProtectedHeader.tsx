import Link from "next/link";
import { getUser } from "@/app/actions/auth";
import { signOut } from "@/app/actions/auth";

export async function ProtectedHeader() {
  const user = await getUser();
  return (
    <header className="border-b border-zinc-800 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          <Link href="/" className="hover:opacity-90">
            Gym Tracker
          </Link>
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/categories"
            className="text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            Categories
          </Link>
          {user?.email && (
            <span className="max-w-[160px] truncate text-sm text-zinc-500 sm:max-w-[220px]">
              {user.email}
            </span>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
