import { SocialSearchClient } from "@/app/components/SocialSearchClient";

type Props = { searchParams?: Promise<{ q?: string }> };

export default async function SearchFriendsPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q : "";

  return (
    <main className="min-h-[100dvh] bg-zinc-950 px-4 py-6 pb-24 text-zinc-100">
      <div className="mx-auto w-full max-w-3xl">
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Find people by username and send friend requests.
        </p>

        <SocialSearchClient initialQuery={q} />
      </div>
    </main>
  );
}

