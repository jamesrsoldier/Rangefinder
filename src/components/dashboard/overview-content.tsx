"use client";

import { useProject } from "@/hooks/use-project";
import { useDateRange } from "@/hooks/use-date-range";
import { useDashboardOverview } from "@/hooks/use-dashboard-data";
import { OverviewCards } from "./overview-cards";
import { VisibilityChart } from "./visibility-chart";
import { EngineBarChart } from "./engine-bar-chart";
import { TopPagesTable } from "./top-pages-table";
import { AlertFeed } from "./alert-feed";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { InlineError } from "@/components/shared/error-boundary";
import { CreateProjectDialog } from "./create-project-dialog";
import { LayoutDashboard } from "lucide-react";

export function OverviewContent() {
  const { projectId, isLoading: projectLoading } = useProject();
  const { from, to } = useDateRange();
  const { data, isLoading, error, mutate } = useDashboardOverview(projectId, from, to);

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
    </div>
  );
}
