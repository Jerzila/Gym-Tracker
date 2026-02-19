import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-4 text-zinc-100">
      <h1 className="text-xl font-semibold">Not found</h1>
      <Link
        href="/"
        className="text-amber-500 hover:text-amber-400"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}
