"use client";

import dynamic from "next/dynamic";
import type { StrengthRankingWithExercises } from "@/app/actions/strengthRanking";
import { SkeletonPanel } from "@/app/components/Skeleton";

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
  return <DashboardStrengthDiagram data={data} gender={gender} />;
}
