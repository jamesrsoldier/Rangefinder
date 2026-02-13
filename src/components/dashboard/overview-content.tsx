"use client";

import { useProject } from "@/hooks/use-project";
import { useDateRange } from "@/hooks/use-date-range";
import { useDashboardOverview } from "@/hooks/use-dashboard-data";
import { useOptimizationScore } from "@/hooks/use-optimization-data";
import { OverviewCards } from "./overview-cards";
import { VisibilityChart } from "./visibility-chart";
import { EngineBarChart } from "./engine-bar-chart";
import { TopPagesTable } from "./top-pages-table";
import { AlertFeed } from "./alert-feed";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { InlineError } from "@/components/shared/error-boundary";
import { CreateProjectDialog } from "./create-project-dialog";
import { LayoutDashboard, Target, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function OverviewContent() {
  const { projectId, isLoading: projectLoading } = useProject();
  const { from, to } = useDateRange();
  const { data, isLoading, error, mutate } = useDashboardOverview(projectId, from, to);
  const { data: optScore } = useOptimizationScore(projectId);

  if (projectLoading || isLoading) return <DashboardSkeleton />;

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <LayoutDashboard className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No project yet</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Create a project to start tracking your brand&apos;s visibility across AI engines.
        </p>
        <div className="mt-4">
          <CreateProjectDialog />
        </div>
      </div>
    );
  }

  if (error) {
    return <InlineError message="Failed to load dashboard data" onRetry={() => mutate()} />;
  }

  if (!data) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <OverviewCards
        visibilityScore={data.visibilityScore}
        visibilityTrend={data.visibilityTrend}
        totalCitations={data.totalCitations}
        citationsTrend={data.citationsTrend}
        aiReferralSessions={data.aiReferralSessions}
        sessionsTrend={data.sessionsTrend}
        shareOfVoice={data.shareOfVoice}
        shareOfVoiceTrend={data.shareOfVoiceTrend}
      />

      <div className="grid gap-4 md:grid-cols-7">
        <VisibilityChart data={data.visibilityOverTime} />
        <EngineBarChart data={data.visibilityByEngine} />
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <TopPagesTable pages={data.topCitedPages} />
        <AlertFeed alerts={data.recentAlerts} />
      </div>

      {/* Optimization Score Card */}
      {optScore && optScore.overall > 0 && (
        <Link href="/dashboard/optimize" className="block">
          <Card className="hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 transition-all cursor-pointer">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Optimization Score</p>
                  <p className="text-xs text-muted-foreground">
                    View recommendations to improve your visibility
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-2xl font-bold",
                  optScore.overall >= 70 ? "text-success" : optScore.overall >= 40 ? "text-warning" : "text-error"
                )}>
                  {optScore.overall.toFixed(0)}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      )}
    </div>
  );
}
