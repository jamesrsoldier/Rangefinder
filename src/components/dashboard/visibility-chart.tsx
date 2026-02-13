"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chartTooltipStyle, chartGridProps, chartAxisTickStyle } from "@/lib/chart-theme";
import { format } from "date-fns";

interface VisibilityChartProps {
  data: { date: string; score: number }[];
}

export function VisibilityChart({ data }: VisibilityChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    dateLabel: format(new Date(d.date + "T00:00:00"), "MMM d"),
  }));

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Visibility Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formatted}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="dateLabel" tick={chartAxisTickStyle} />
              <YAxis domain={[0, 100]} tick={chartAxisTickStyle} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${Number(value).toFixed(1)}`, "Score"]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="score"
                name="Visibility Score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
