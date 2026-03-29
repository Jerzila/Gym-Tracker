import { FriendsLeaderboard } from "@/app/components/FriendsLeaderboard";
import { SocialFriendsList } from "@/app/components/SocialFriendsList";

export default function SocialPage() {
  return (
    <main className="min-h-[100dvh] bg-zinc-950 px-4 py-6 pb-24 text-zinc-100">
      <div className="mx-auto w-full max-w-3xl">
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Find friends and manage your incoming requests.
        </p>

        <div className="mt-6 space-y-6">
          <FriendsLeaderboard />
          <SocialFriendsList />
        </div>
      </div>
    </main>
  );
}
