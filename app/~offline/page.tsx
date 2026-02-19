export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-semibold mb-2">You&apos;re offline</h1>
      <p className="text-muted-foreground mb-4">
        Some features need a connection. Reconnect to sync and browse fully.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-4 py-2 rounded-md bg-foreground text-background font-medium"
      >
        Retry
      </button>
    </main>
  );
}
