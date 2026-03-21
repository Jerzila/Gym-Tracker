import Link from "next/link";

export function SettingsMenuRow({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60 tap-feedback"
    >
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-zinc-100">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{subtitle}</p>
      </div>
      <span className="shrink-0 text-lg text-zinc-500" aria-hidden>
        ›
      </span>
    </Link>
  );
}
