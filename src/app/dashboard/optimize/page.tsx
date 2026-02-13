import { Suspense } from "react";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { OptimizeContent } from "@/components/dashboard/optimize-content";

export default function OptimizePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Optimize</h2>
        <p className="text-sm text-muted-foreground">
          AI-powered recommendations to improve your visibility across AI engines
        </p>
      </div>
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <OptimizeContent />
      </Suspense>
    </div>
  );
}
