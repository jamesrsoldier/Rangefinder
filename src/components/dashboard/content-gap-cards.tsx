"use client";

import { AlertTriangle, FileX, Clock, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContentGapResponse, EngineType } from "@/types";
import { ENGINE_LABELS } from "@/lib/constants";

const GAP_TYPE_CONFIG: Record<string, { label: string; icon: typeof AlertTriangle; color: string }> = {
  no_brand_citation: { label: "No Brand Citation", icon: FileX, color: "text-error" },
  competitor_only: { label: "Competitor Cited", icon: AlertTriangle, color: "text-warning" },
  stale_content: { label: "Stale Content", icon: Clock, color: "text-warning" },
  low_prominence: { label: "Low Position", icon: ArrowDown, color: "text-primary" },
};

function getSeverityBadge(severity: number) {
  if (severity >= 0.7) return { label: "High", className: "bg-error-muted text-error-muted-foreground border-error/20" };
  if (severity >= 0.4) return { label: "Medium", className: "bg-warning-muted text-warning-muted-foreground border-warning/20" };
  return { label: "Low", className: "bg-muted text-muted-foreground border-border" };
}

interface ContentGapCardsProps {
  gaps: ContentGapResponse[];
  summary: Record<string, number>;
}

export function ContentGapCards({ gaps, summary }: ContentGapCardsProps) {
  if (gaps.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Content Gaps</h3>
        <div className="flex gap-2">
          {Object.entries(summary).map(([type, count]) => {
            const config = GAP_TYPE_CONFIG[type];
            return (
              <Badge key={type} variant="outline" className="text-xs">
                {config?.label ?? type}: {count}
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {gaps.map((gap) => {
          const config = GAP_TYPE_CONFIG[gap.gapType] || GAP_TYPE_CONFIG.no_brand_citation;
          const Icon = config.icon;
          const severityBadge = getSeverityBadge(gap.severity);

          return (
            <Card key={gap.id} className="border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", config.color)} />
                    <span className={cn("text-xs font-medium", config.color)}>
                      {config.label}
                    </span>
                  </div>
                  <Badge variant="outline" className={cn("text-xs", severityBadge.className)}>
                    {severityBadge.label}
                  </Badge>
                </div>

                <p className="font-medium text-sm mb-1">{gap.keyword}</p>

                {gap.competitorName && (
                  <p className="text-xs text-muted-foreground mb-1">
                    Competitor: {gap.competitorName}
                    {gap.competitorUrl && (
                      <span className="block truncate text-xs text-muted-foreground/70">
                        {gap.competitorUrl}
                      </span>
                    )}
                  </p>
                )}

                {gap.engineTypes.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {gap.engineTypes.map((engine) => (
                      <Badge key={engine} variant="secondary" className="text-xs px-1.5 py-0">
                        {ENGINE_LABELS[engine as EngineType] ?? engine}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
