"use client";

import { Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendIndicator } from "@/components/shared/trend-indicator";
import { cn } from "@/lib/utils";
import type { OptimizationScoreResponse } from "@/types";

interface OptimizationScoreCardProps {
  score: OptimizationScoreResponse;
}

function getScoreColor(value: number): string {
  if (value >= 70) return "text-emerald-600";
  if (value >= 40) return "text-amber-600";
  return "text-red-600";
}

function getProgressColor(value: number): string {
  if (value >= 70) return "[&>div]:bg-emerald-500";
  if (value >= 40) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-500";
}

export function OptimizationScoreCard({ score }: OptimizationScoreCardProps) {
  const overall = score.overall ?? 0;
  const trend = score.trend ?? 0;
  const metrics = [
    { label: "Content Coverage", value: score.contentCoverage ?? 0, description: "Keywords with brand citations" },
    { label: "Competitive Position", value: score.competitiveGap ?? 0, description: "Gap vs competitors" },
    { label: "Citation Consistency", value: score.citationConsistency ?? 0, description: "Cross-engine consistency" },
    { label: "Content Freshness", value: score.freshness ?? 0, description: "Citation retention over time" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" />
          Optimization Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Main score */}
          <div className="flex flex-col items-center justify-center min-w-[140px]">
            <span className={cn("text-5xl font-bold", getScoreColor(overall))}>
              {overall.toFixed(0)}
            </span>
            <span className="text-sm text-muted-foreground mt-1">out of 100</span>
            {trend !== 0 && (
              <TrendIndicator value={trend} className="mt-2" />
            )}
          </div>

          {/* Sub-scores */}
          <div className="flex-1 grid gap-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{metric.label}</span>
                  <span className={cn("font-semibold", getScoreColor(metric.value))}>
                    {metric.value.toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={metric.value}
                  className={cn("h-2", getProgressColor(metric.value))}
                />
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
