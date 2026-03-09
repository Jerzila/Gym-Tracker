"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatWeight } from "@/lib/formatWeight";

type SparklinePoint = { date: string; weight: number };

export function BodyweightSparkline({ data }: { data: SparklinePoint[] }) {
  if (data.length === 0) return null;
  return (
    <div className="mt-3 h-14 w-full">
      <ResponsiveContainer width="100%" height={56}>
        <LineChart
          data={[...data].reverse()}
          margin={{ top: 2, right: 2, left: -20, bottom: 0 }}
        >
          <XAxis dataKey="date" hide />
          <YAxis domain={["auto", "auto"]} hide width={0} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number | undefined) =>
              [value != null ? `${formatWeight(value)} kg` : "", "Weight"]
            }
            labelFormatter={(label) =>
              label ? new Date(label).toLocaleDateString() : ""
            }
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#f59e0b" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
