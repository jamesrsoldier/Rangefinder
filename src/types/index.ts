// ============================================
// ENUM TYPES (mirror DB enums)
// ============================================

export type SubscriptionTier = 'free' | 'starter' | 'growth';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
export type EngineType = 'perplexity' | 'google_ai_overview' | 'chatgpt' | 'bing_copilot' | 'claude';
export type QueryRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'partial';
export type MentionType = 'direct_citation' | 'brand_name' | 'indirect_mention' | 'not_found';
export type SentimentType = 'positive' | 'neutral' | 'negative';
export type AlertType = 'visibility_drop' | 'visibility_increase' | 'new_citation' | 'lost_citation' | 'competitor_change' | 'negative_sentiment';
export type AlertChannel = 'email' | 'in_app';
export type OrgRole = 'owner' | 'admin' | 'member';

// Optimization enums
export type RecommendationType = 'create_content' | 'update_content' | 'add_schema' | 'improve_structure' | 'add_comparison' | 'improve_authority' | 'optimize_citations';
export type RecommendationStatus = 'active' | 'dismissed' | 'completed' | 'expired';
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type AnalysisSource = 'rule_based' | 'ai_powered';
export type ContentGapType = 'no_brand_citation' | 'competitor_only' | 'stale_content' | 'low_prominence';

// ============================================
// PLAN LIMITS
// ============================================

export interface PlanLimits {
  maxKeywords: number;
  maxProjects: number;
  maxCompetitors: number;
  engines: EngineType[];
  queryFrequency: 'daily' | 'twice_daily';
  runsPerKeyword: number;
  ga4Integration: boolean;
  gscIntegration: boolean;
  apiAccess: boolean;
  aiPoweredOptimization: boolean;
  aiAnalysisPerMonth: number;
}

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  free: {
    maxKeywords: 10,
    maxProjects: 1,
    maxCompetitors: 1,
    engines: ['perplexity'],
    queryFrequency: 'daily',
    runsPerKeyword: 1,
    ga4Integration: false,
    gscIntegration: false,
    apiAccess: false,
    aiPoweredOptimization: false,
    aiAnalysisPerMonth: 0,
  },
  starter: {
    maxKeywords: 100,
    maxProjects: 2,
    maxCompetitors: 3,
    engines: ['perplexity', 'google_ai_overview', 'chatgpt'],
    queryFrequency: 'daily',
    runsPerKeyword: 3,
    ga4Integration: true,
    gscIntegration: false,
    apiAccess: false,
    aiPoweredOptimization: true,
    aiAnalysisPerMonth: 5,
  },
  growth: {
    maxKeywords: 500,
    maxProjects: 5,
    maxCompetitors: 10,
    engines: ['perplexity', 'google_ai_overview', 'chatgpt', 'bing_copilot', 'claude'],
    queryFrequency: 'twice_daily',
    runsPerKeyword: 5,
    ga4Integration: true,
    gscIntegration: true,
    apiAccess: true,
    aiPoweredOptimization: true,
    aiAnalysisPerMonth: 50,
  },
};

// ============================================
// API REQUEST TYPES
// ============================================

export interface CreateProjectRequest {
  name: string;
  domain: string;
  brandName: string;
  brandAliases?: string[];
}

export interface AddKeywordsRequest {
  keywords: { keyword: string; category?: string }[];
}

export interface TriggerMonitoringRequest {
  projectId: string;
  engineTypes?: EngineType[];
  keywordIds?: string[];
}

export interface AddCompetitorRequest {
  domain: string;
  name: string;
  aliases?: string[];
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ProjectResponse {
  id: string;
  name: string;
  domain: string;
  brandName: string;
  brandAliases: string[];
  ga4Connected: boolean;
  gscConnected: boolean;
  keywordCount: number;
  createdAt: string;
}

export interface KeywordResponse {
  id: string;
  keyword: string;
  category: string | null;
  isActive: boolean;
  latestVisibilityScore: number | null;
  createdAt: string;
}

export interface QueryRunResponse {
  id: string;
  status: QueryRunStatus;
  engineTypes: EngineType[];
  totalKeywords: number;
  completedKeywords: number;
  failedKeywords: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface DashboardOverview {
  visibilityScore: number;
  visibilityTrend: number;
  totalCitations: number;
  citationsTrend: number;
  aiReferralSessions: number;
  sessionsTrend: number;
  shareOfVoice: number;
  shareOfVoiceTrend: number;
  visibilityByEngine: { engine: EngineType; score: number }[];
  visibilityOverTime: { date: string; score: number }[];
  topCitedPages: { url: string; citations: number; engines: EngineType[] }[];
  recentAlerts: AlertEventResponse[];
}

export interface VisibilityByKeyword {
  keywordId: string;
  keyword: string;
  category: string | null;
  overallScore: number;
  confidence: number;
  byEngine: { engine: EngineType; score: number; cited: boolean }[];
  trend: number;
}

export interface CitationDetail {
  id: string;
  keyword: string;
  engineType: EngineType;
  citedUrl: string;
  citedDomain: string;
  position: number | null;
  prominenceScore: number;
  isBrandCitation: boolean;
  createdAt: string;
}

export interface CompetitorBenchmark {
  competitorId: string;
  competitorName: string;
  competitorDomain: string;
  visibilityScore: number;
  citationCount: number;
  shareOfVoice: number;
  topKeywords: { keyword: string; cited: boolean }[];
}

export interface TrafficOverview {
  totalAiSessions: number;
  totalAiUsers: number;
  totalAiConversions: number;
  avgEngagementTime: number;
  engagementRate: number;
  bySource: { source: string; sessions: number; conversions: number }[];
  overTime: { date: string; sessions: number }[];
  topLandingPages: { page: string; sessions: number; engagementRate: number }[];
}

export interface AlertEventResponse {
  id: string;
  alertType: AlertType;
  title: string;
  description: string;
  isRead: boolean;
  createdAt: string;
}

export interface CompetitorResponse {
  id: string;
  domain: string;
  name: string;
  aliases: string[];
  createdAt: string;
}

// ============================================
// METRIC CALCULATION TYPES
// ============================================

export interface VisibilityCalculation {
  score: number;
  breakdown: {
    engine: EngineType;
    keywordsCited: number;
    totalKeywords: number;
    rawScore: number;
    weight: number;
  }[];
}

export interface CitationConfidence {
  keywordId: string;
  engine: EngineType;
  runsWithCitation: number;
  totalRuns: number;
  confidence: number;
}

export interface ShareOfVoiceCalculation {
  brandCitations: number;
  competitorCitations: { competitorId: string; count: number }[];
  totalCitations: number;
  shareOfVoice: number;
}

export interface ProminenceScore {
  position: number | null;
  score: number;
}

// ============================================
// OPTIMIZATION RESPONSE TYPES
// ============================================

export interface RecommendationResponse {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  source: AnalysisSource;
  title: string;
  description: string;
  actionableSteps: string[];
  estimatedImpact: number;
  keyword: string | null;
  keywordId: string | null;
  competitorName: string | null;
  targetUrl: string | null;
  createdAt: string;
}

export interface ContentGapResponse {
  id: string;
  keyword: string;
  keywordId: string;
  gapType: ContentGapType;
  competitorName: string | null;
  competitorUrl: string | null;
  engineTypes: EngineType[];
  severity: number;
  source: AnalysisSource;
  createdAt: string;
}

export interface ActionItemResponse {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  estimatedImpact: number;
  keyword: string | null;
  competitorName: string | null;
  source: AnalysisSource;
  createdAt: string;
}

export interface OptimizationScoreResponse {
  overall: number;
  contentCoverage: number;
  competitiveGap: number;
  citationConsistency: number;
  freshness: number;
  trend: number;
}

export interface OptimizationSummaryResponse {
  activeRecommendations: number;
  criticalItems: number;
  optimizationScore: number;
  byKeyword: Record<string, { recommendations: number; hasContentGap: boolean }>;
}
