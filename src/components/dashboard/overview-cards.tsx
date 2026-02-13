"use client";

import { Eye, Quote, BarChart3, PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendIndicator } from "@/components/shared/trend-indicator";
import { formatNumber } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
  index: number;
}

function MetricCard({ title, value, trend, icon, index }: MetricCardProps) {
  return (
    <Card
      className="border-l-2 border-l-primary/20 opacity-0 animate-fade-in"
      style={{ animationDelay: `${index * 75}ms` }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-primary/70">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <TrendIndicator value={trend} className="mt-1" />
      </CardContent>
    </Card>
  );
}

interface OverviewCardsProps {
  visibilityScore: number;
  visibilityTrend: number;
  totalCitations: number;
  citationsTrend: number;
  aiReferralSessions: number;
  sessionsTrend: number;
  shareOfVoice: number;
  shareOfVoiceTrend: number;
}

export function OverviewCards({
  visibilityScore,
  visibilityTrend,
  totalCitations,
  citationsTrend,
  aiReferralSessions,
  sessionsTrend,
  shareOfVoice,
  shareOfVoiceTrend,
}: OverviewCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Visibility Score"
        value={visibilityScore.toFixed(1)}
        trend={visibilityTrend}
        icon={<Eye className="h-4 w-4" />}
        index={0}
      />
      <MetricCard
        title="Total Citations"
        value={formatNumber(totalCitations)}
        trend={citationsTrend}
        icon={<Quote className="h-4 w-4" />}
        index={1}
      />
      <MetricCard
        title="AI Sessions"
        value={formatNumber(aiReferralSessions)}
        trend={sessionsTrend}
        icon={<BarChart3 className="h-4 w-4" />}
        index={2}
      />
      <MetricCard
        title="Share of Voice"
        value={`${shareOfVoice.toFixed(0)}%`}
        trend={shareOfVoiceTrend}
        icon={<PieChart className="h-4 w-4" />}
        index={3}
      />
    </div>
  );
}
