"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">You are offline</h1>
      <p className="text-zinc-500">Please check your internet connection.</p>
      <a
        href="/"
        className="rounded-md bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-300"
      >
        Try Again
      </a>
    </div>
  );
}
