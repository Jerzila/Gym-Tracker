import { notFound } from "next/navigation";
import type { StrengthRankingWithExercises } from "@/app/actions/strengthRanking";
import { StaticStrengthDiagram } from "@/app/components/StaticStrengthDiagram";
import { getStrengthCompareWithFriendPageData } from "@/app/actions/social";
import { MuscleStrengthRankLegend } from "@/app/components/MuscleStrengthRankLegend";

const COMPARE_DIAGRAM_SCALE = 0.78;

type Props = { searchParams?: Promise<{ with?: string }> };

export default async function StrengthCompareFriendPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const friendId = String(sp.with ?? "").trim();
  if (!friendId) notFound();

  const { data, error } = await getStrengthCompareWithFriendPageData(friendId);
  if (error || !data) notFound();

  return (
    <main className="mx-auto max-w-xl px-3 py-4 sm:px-4 sm:py-8">
      <p className="text-center text-xs text-zinc-500">
        You · {data.friendUsername}
      </p>

      <div className="mt-6 flex flex-col gap-8">
        <CompareRow
          title="Front"
          side="front"
          leftLabel="You"
          rightLabel={data.friendUsername}
          leftData={data.myStrength}
          rightData={data.friendStrength}
          leftGender={data.myGender}
          rightGender={data.friendGender}
        />
        <aside className="mx-auto w-full max-w-md px-0.5">
          <MuscleStrengthRankLegend />
        </aside>
        <CompareRow
          title="Back"
          side="back"
          leftLabel="You"
          rightLabel={data.friendUsername}
          leftData={data.myStrength}
          rightData={data.friendStrength}
          leftGender={data.myGender}
          rightGender={data.friendGender}
        />
      </div>

      <p className="mt-8 text-center text-[11px] text-zinc-600">
        Friend ranks use their last saved strength snapshot. Yours are live from your training data.
      </p>
    </main>
  );
}

function CompareRow({
  title,
  side,
  leftLabel,
  rightLabel,
  leftData,
  rightData,
  leftGender,
  rightGender,
}: {
  title: string;
  side: "front" | "back";
  leftLabel: string;
  rightLabel: string;
  leftData: StrengthRankingWithExercises;
  rightData: StrengthRankingWithExercises;
  leftGender: "male" | "female";
  rightGender: "male" | "female";
}) {
  const labelClass =
    "text-center text-[10px] font-medium leading-tight text-zinc-500 [overflow-wrap:anywhere] min-w-0 px-0.5";

  return (
    <section className="mx-auto w-full max-w-md">
      <h2 className="text-sm font-semibold tracking-tight text-zinc-100">{title}</h2>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-2 gap-y-2 sm:gap-x-3">
        <p className={labelClass}>{leftLabel}</p>
        <span className="text-center text-[10px] font-semibold text-zinc-600" aria-hidden>
          ·
        </span>
        <p className={labelClass}>{rightLabel}</p>

        <div className="flex items-center justify-center">
          <StaticStrengthDiagram
            data={leftData}
            side={side}
            gender={leftGender}
            scale={COMPARE_DIAGRAM_SCALE}
          />
        </div>
        <div aria-hidden className="min-w-[0.5rem]" />
        <div className="flex items-center justify-center">
          <StaticStrengthDiagram
            data={rightData}
            side={side}
            gender={rightGender}
            scale={COMPARE_DIAGRAM_SCALE}
          />
        </div>
      </div>
    </section>
  );
}

