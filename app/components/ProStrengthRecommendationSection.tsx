"use client";

import type { StrengthRecommendation } from "@/lib/strengthRecommendation";
import { StrengthRecommendationCard } from "@/app/components/StrengthRecommendationCard";
import { ProLockedCard } from "@/app/components/ProLockedCard";
import { useProAccess } from "@/app/components/ProAccessProvider";

export function ProStrengthRecommendationSection({
  recommendation,
}: {
  recommendation: StrengthRecommendation;
}) {
  const { hasPro } = useProAccess();
  if (!hasPro) {
    return (
      <ProLockedCard
        title="Strength recommendations are Pro"
        description="Unlock personalized progression targets for every lift."
        reason="improve_rank"
      />
    );
  }
  return <StrengthRecommendationCard recommendation={recommendation} />;
}
