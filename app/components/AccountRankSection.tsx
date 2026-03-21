"use client";

import dynamic from "next/dynamic";
import { SkeletonPanel } from "@/app/components/Skeleton";
import type { OverallRankDisplaySnapshot } from "@/lib/strengthRanking";

const DashboardRankWidget = dynamic(
  () =>
    import("@/app/components/DashboardRankWidget").then((m) => ({
      default: m.DashboardRankWidget,
    })),
  { ssr: false, loading: () => <SkeletonPanel height="h-[200px]" /> }
);

export function AccountRankSection({ display }: { display: OverallRankDisplaySnapshot | null }) {
  return (
    <section>
      <DashboardRankWidget display={display} />
    </section>
  );
}
