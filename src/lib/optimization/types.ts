import type { EngineType, RecommendationType, RecommendationPriority, ContentGapType, AnalysisSource } from '@/types';

// ============================================
// ANALYSIS CONTEXT (input to analyzers)
// ============================================

export interface AnalysisContext {
  project: {
    id: string;
    domain: string;
    brandName: string;
    brandAliases: string[];
  };
  keywords: {
    id: string;
    keyword: string;
    category: string | null;
  }[];
  competitors: {
    id: string;
    domain: string;
    name: string;
  }[];
  queryRunId: string;
}

// ============================================
// PER-KEYWORD ANALYSIS DATA
// ============================================

export interface KeywordAnalysis {
  keywordId: string;
  keyword: string;
  category: string | null;
  hasBrandCitation: boolean;
  brandCitationCount: number;
  brandCitationPositions: (number | null)[];
  competitorCitations: {
    competitorId: string;
    competitorName: string;
    count: number;
    urls: string[];
  }[];
  engines: {
    engine: EngineType;
    hasBrandCitation: boolean;
    brandCitationCount: number;
    competitorCitationCount: number;
  }[];
  mentionType: string | null;
  sentiment: string | null;
  brandMentionCount: number;
}

export interface PreviousRunKeywordData {
  keywordId: string;
  hasBrandCitation: boolean;
  brandCitationCount: number;
  lastCitedAt: Date | string | null;
}

export interface AnalysisData {
  keywordAnalyses: KeywordAnalysis[];
  previousRunData: PreviousRunKeywordData[];
  totalKeywords: number;
  keywordsWithBrandCitation: number;
  keywordsWithCompetitorCitation: number;
}

// ============================================
// GENERATED OUTPUTS
// ============================================

export interface GeneratedRecommendation {
  keywordId?: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  source: AnalysisSource;
  title: string;
  description: string;
  actionableSteps: string[];
  estimatedImpact: number;
  targetUrl?: string;
  competitorId?: string;
  metadata: Record<string, unknown>;
}

export interface GeneratedContentGap {
  keywordId: string;
  gapType: ContentGapType;
  competitorId?: string;
  competitorUrl?: string;
  brandLastCitedAt?: Date | string | null;
  engineTypes: EngineType[];
  severity: number;
  source: AnalysisSource;
  metadata: Record<string, unknown>;
}

export interface OptimizationScoreData {
  overallScore: number;
  contentCoverage: number;
  competitiveGap: number;
  citationConsistency: number;
  freshness: number;
}

export interface AnalysisResult {
  recommendations: GeneratedRecommendation[];
  contentGaps: GeneratedContentGap[];
  score: OptimizationScoreData;
}
