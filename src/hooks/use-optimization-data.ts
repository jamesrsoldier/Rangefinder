"use client";

import useSWR from "swr";
import type {
  RecommendationResponse,
  ContentGapResponse,
  ActionItemResponse,
  OptimizationScoreResponse,
  OptimizationSummaryResponse,
  RecommendationType,
  RecommendationPriority,
  AnalysisSource,
} from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  return r.json();
});

const SWR_CONFIG = {
  refreshInterval: 60000,
  revalidateOnFocus: true,
  dedupingInterval: 10000,
};

function buildUrl(base: string, params?: Record<string, string | number | boolean | undefined | null>) {
  const url = new URL(base, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export function useOptimizationScore(projectId: string | null) {
  return useSWR<OptimizationScoreResponse>(
    projectId ? `/api/projects/${projectId}/optimization/score` : null,
    fetcher,
    SWR_CONFIG
  );
}

export function useRecommendations(
  projectId: string | null,
  params?: {
    status?: string;
    type?: RecommendationType;
    priority?: RecommendationPriority;
    keywordId?: string;
    source?: AnalysisSource;
    page?: number;
    limit?: number;
  }
) {
  return useSWR<{ data: RecommendationResponse[]; total: number }>(
    projectId ? buildUrl(`/api/projects/${projectId}/optimization/recommendations`, params) : null,
    fetcher,
    SWR_CONFIG
  );
}

export function useContentGaps(
  projectId: string | null,
  params?: { gapType?: string; keywordId?: string; page?: number; limit?: number }
) {
  return useSWR<{ data: ContentGapResponse[]; total: number; summary: { byType: Record<string, number> } }>(
    projectId ? buildUrl(`/api/projects/${projectId}/optimization/content-gaps`, params) : null,
    fetcher,
    SWR_CONFIG
  );
}

export function useActionItems(
  projectId: string | null,
  params?: { priority?: RecommendationPriority; limit?: number }
) {
  return useSWR<ActionItemResponse[]>(
    projectId ? buildUrl(`/api/projects/${projectId}/optimization/action-items`, params) : null,
    fetcher,
    SWR_CONFIG
  );
}

export function useOptimizationSummary(projectId: string | null) {
  return useSWR<OptimizationSummaryResponse>(
    projectId ? `/api/projects/${projectId}/optimization/summary` : null,
    fetcher,
    SWR_CONFIG
  );
}
