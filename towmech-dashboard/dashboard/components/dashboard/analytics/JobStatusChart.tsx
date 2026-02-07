"use client";

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  jobsByStatus: Record<string, number>;
};

export function JobStatusChart({ jobsByStatus }: Props) {
  const data = Object.entries(jobsByStatus || {}).map(([status, total]) => ({
    status,
    total,
  }));

  if (!data.length) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No job status data available.
      </div>
    );
  }

  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="status" />
          <Tooltip />
          <Bar dataKey="total" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
