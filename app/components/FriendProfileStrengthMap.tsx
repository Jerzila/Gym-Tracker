"use client";

import dynamic from "next/dynamic";
import type { StrengthRankingWithExercises } from "@/app/actions/strengthRanking";
import { SkeletonPanel } from "@/app/components/Skeleton";
import { useProAccess } from "@/app/components/ProAccessProvider";
import { ProLockedCard } from "@/app/components/ProLockedCard";

const DashboardStrengthDiagram = dynamic(
  () =>
    import("@/app/components/DashboardStrengthDiagram").then((m) => ({
      default: m.DashboardStrengthDiagram,
    })),
  { ssr: false, loading: () => <SkeletonPanel height="h-64" /> }
);

export function FriendProfileStrengthMap({
  data,
  gender,
}: {
  data: StrengthRankingWithExercises;
  gender: "male" | "female";
}) {
  const { hasPro } = useProAccess();
  if (!hasPro) {
    return (
      <ProLockedCard
        title="Friend strength maps are Pro-only"
        description="Unlock Pro to view detailed friend muscle maps and compare strength with your profile."
        reason="friend_profile"
      />
    );
  }
  return <DashboardStrengthDiagram data={data} gender={gender} />;
}
