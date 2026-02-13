"use client";

import { useState, useCallback } from "react";
import { Lightbulb, Sparkles, Lock } from "lucide-react";
import { useProject } from "@/hooks/use-project";
import {
  useOptimizationScore,
  useRecommendations,
  useContentGaps,
  useActionItems,
} from "@/hooks/use-optimization-data";
import { OptimizationScoreCard } from "./optimization-score-card";
import { ActionItemsList } from "./action-items-list";
import { ContentGapCards } from "./content-gap-cards";
import { RecommendationCard } from "./recommendation-card";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { InlineError } from "@/components/shared/error-boundary";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalysisSource } from "@/types";

export function OptimizeContent() {
  const { projectId, isLoading: projectLoading } = useProject();
  const [sourceFilter, setSourceFilter] = useState<AnalysisSource | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [aiTriggering, setAiTriggering] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const sourceParam = sourceFilter === "all" ? undefined : sourceFilter;

  const { data: score, isLoading: scoreLoading, error: scoreError } = useOptimizationScore(projectId);
  const { data: recsData, isLoading: recsLoading, error: recsError, mutate: mutateRecs } = useRecommendations(
    projectId,
    { source: sourceParam }
  );
  const { data: gapsData, isLoading: gapsLoading, error: gapsError } = useContentGaps(projectId);
  const { data: actionItems, isLoading: actionsLoading, error: actionsError, mutate: mutateActions } = useActionItems(projectId);

  const isLoading = projectLoading || scoreLoading || recsLoading || gapsLoading || actionsLoading;
  const hasError = scoreError || recsError || gapsError || actionsError;

  const handleUpdateRecommendation = useCallback(
    async (id: string, status: "dismissed" | "completed") => {
      if (!projectId) return;
      setUpdatingId(id);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/optimization/recommendations/${id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }
        );
        if (!res.ok) throw new Error("Failed to update");
        mutateRecs();
        mutateActions();
      } catch {
        // Silently fail — the data will refresh on next poll
      } finally {
        setUpdatingId(null);
      }
    },
    [projectId, mutateRecs, mutateActions]
  );

  const handleTriggerAiAnalysis = useCallback(async () => {
    if (!projectId) return;
    setAiTriggering(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/optimization/analyze`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "Failed to trigger AI analysis");
        return;
      }
      // Analysis started — results will appear after processing
      setAiError(null);
    } catch {
      setAiError("Failed to trigger AI analysis");
    } finally {
      setAiTriggering(false);
    }
  }, [projectId]);

  if (isLoading) return <TableSkeleton rows={8} />;

  if (hasError) {
    return (
      <InlineError
        message="Failed to load optimization data"
        onRetry={() => {
          mutateRecs();
          mutateActions();
        }}
      />
    );
  }

  const recommendations = recsData?.data ?? [];
  const gaps = gapsData?.data ?? [];
  const gapSummary = gapsData?.summary?.byType ?? {};
  const items = actionItems ?? [];

  const hasNoData = recommendations.length === 0 && gaps.length === 0 && (!score || score.overall === 0);

  if (hasNoData) {
    return (
      <EmptyState
        icon={<Lightbulb className="h-6 w-6" />}
        title="No optimization data yet"
        description="Run a monitoring scan to generate recommendations and content gap analysis."
        action={{ label: "Go to Keywords", href: "/dashboard/keywords" }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Card */}
      {score && <OptimizationScoreCard score={score} />}

      {/* Source toggle + AI trigger */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Tabs
          value={sourceFilter}
          onValueChange={(v) => setSourceFilter(v as AnalysisSource | "all")}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="rule_based">Rule-Based</TabsTrigger>
            <TabsTrigger value="ai_powered">
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              AI-Powered
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleTriggerAiAnalysis}
            disabled={aiTriggering}
            variant="outline"
            size="sm"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {aiTriggering ? "Analyzing..." : "Run AI Analysis"}
          </Button>
          {aiError && (
            <Badge variant="outline" className="text-xs text-red-600 border-red-200">
              {aiError.includes("Starter") ? (
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {aiError}
                </span>
              ) : (
                aiError
              )}
            </Badge>
          )}
        </div>
      </div>

      {/* Prioritized Action Items */}
      <ActionItemsList
        items={items}
        onDismiss={(id) => handleUpdateRecommendation(id, "dismissed")}
        onComplete={(id) => handleUpdateRecommendation(id, "completed")}
        isUpdating={updatingId}
      />

      {/* Content Gaps */}
      <ContentGapCards gaps={gaps} summary={gapSummary} />

      {/* All Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold">
            All Recommendations
            <Badge variant="secondary" className="ml-2">
              {recsData?.total ?? recommendations.length}
            </Badge>
          </h3>
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onDismiss={(id) => handleUpdateRecommendation(id, "dismissed")}
              onComplete={(id) => handleUpdateRecommendation(id, "completed")}
              isUpdating={updatingId === rec.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
