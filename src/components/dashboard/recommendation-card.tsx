"use client";

import { useState } from "react";
import {
  FileText,
  RefreshCw,
  Code,
  Layout,
  GitCompare,
  Shield,
  Zap,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Cpu,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecommendationResponse } from "@/types";

const TYPE_ICONS: Record<string, typeof FileText> = {
  create_content: FileText,
  update_content: RefreshCw,
  add_schema: Code,
  improve_structure: Layout,
  add_comparison: GitCompare,
  improve_authority: Shield,
  optimize_citations: Zap,
};

const TYPE_LABELS: Record<string, string> = {
  create_content: "Create Content",
  update_content: "Update Content",
  add_schema: "Add Schema",
  improve_structure: "Improve Structure",
  add_comparison: "Add Comparison",
  improve_authority: "Build Authority",
  optimize_citations: "Optimize Citations",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-error-muted text-error-muted-foreground border-error/20",
  high: "bg-warning-muted text-warning-muted-foreground border-warning/20",
  medium: "bg-warning-muted text-warning-muted-foreground border-warning/20",
  low: "bg-muted text-muted-foreground border-border",
};

interface RecommendationCardProps {
  recommendation: RecommendationResponse;
  onDismiss: (id: string) => void;
  onComplete: (id: string) => void;
  isUpdating: boolean;
}

export function RecommendationCard({
  recommendation: rec,
  onDismiss,
  onComplete,
  isUpdating,
}: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TYPE_ICONS[rec.type] || FileText;

  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-muted p-1.5">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[rec.priority])}>
                {rec.priority}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {TYPE_LABELS[rec.type] ?? rec.type}
              </Badge>
              {rec.source === "ai_powered" ? (
                <Sparkles className="h-3.5 w-3.5 text-ai-accent" />
              ) : (
                <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              {(rec.estimatedImpact ?? 0) > 0 && (
                <span className="text-xs font-medium text-impact-positive">
                  +{(rec.estimatedImpact ?? 0).toFixed(0)}% impact
                </span>
              )}
            </div>

            <p className="font-medium text-sm">{rec.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>

            {rec.keyword && (
              <p className="text-xs text-muted-foreground mt-1">
                Keyword: <span className="font-medium">{rec.keyword}</span>
              </p>
            )}

            {rec.actionableSteps.length > 0 && (
              <button
                className="flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {expanded ? "Hide" : "Show"} {rec.actionableSteps.length} steps
              </button>
            )}

            {expanded && rec.actionableSteps.length > 0 && (
              <ol className="mt-2 space-y-1 pl-4 list-decimal">
                {rec.actionableSteps.map((step, i) => (
                  <li key={i} className="text-xs text-muted-foreground">{step}</li>
                ))}
              </ol>
            )}
          </div>

          <div className="flex gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onComplete(rec.id)}
              disabled={isUpdating}
              title="Mark complete"
            >
              <Check className="h-3.5 w-3.5 text-success" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onDismiss(rec.id)}
              disabled={isUpdating}
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
