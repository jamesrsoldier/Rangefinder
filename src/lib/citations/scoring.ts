import type { EngineType } from '@/types';

// Engine importance weights for visibility score calculation
const ENGINE_WEIGHTS: Record<EngineType, number> = {
  perplexity: 1.0,
  google_ai_overview: 1.5,
  chatgpt: 0.8,
  bing_copilot: 0.6,
  claude: 0.5,
};

// ============================================
// AI VISIBILITY SCORE
// ============================================

/** Original NSDi3 input — includes engine-specific weighting. */
export interface VisibilityInput {
  engine: EngineType;
  keywordsWithBrandCitation: number;
  totalKeywordsQueried: number;
}

/**
 * Simplified visibility input expected by consumers on other branches.
 * Maps to VisibilityInput semantics:
 *   keywordsCited   -> keywordsWithBrandCitation
 *   totalKeywords   -> totalKeywordsQueried
 */
export interface EngineVisibilityInput {
  engine?: EngineType;
  keywordsCited: number;
  totalKeywords: number;
}

/**
 * Calculates the overall AI Visibility Score across engines.
 *
 * Formula per engine:
 *   engine_score = (keywords_with_brand_citation / total_keywords_queried) * 100
 *   weighted_score = engine_score * ENGINE_WEIGHT
 *
 * Overall = sum(weighted_scores) / sum(weights_of_active_engines)
 *
 * --- Overload 1 (NSDi3 / original) ---
 * Accepts VisibilityInput[] and returns { overall, byEngine }.
 *
 * --- Overload 2 (consumer / compat) ---
 * Accepts EngineVisibilityInput[] and returns { score }.
 */
export function calculateVisibilityScore(inputs: VisibilityInput[]): {
  overall: number;
  byEngine: { engine: EngineType; score: number; weight: number; weighted: number }[];
};
export function calculateVisibilityScore(inputs: EngineVisibilityInput[]): {
  score: number;
};
export function calculateVisibilityScore(
  inputs: VisibilityInput[] | EngineVisibilityInput[],
): {
  overall?: number;
  score?: number;
  byEngine?: { engine: EngineType; score: number; weight: number; weighted: number }[];
} {
  if (inputs.length === 0) {
    return { overall: 0, score: 0, byEngine: [] };
  }

  // Distinguish input shape at runtime.
  // VisibilityInput has `keywordsWithBrandCitation`; EngineVisibilityInput has `keywordsCited`.
  // Both may have `engine`, so we use a field unique to the original shape.
  const isOriginalInput = (item: VisibilityInput | EngineVisibilityInput): item is VisibilityInput =>
    'keywordsWithBrandCitation' in item;

  if (isOriginalInput(inputs[0])) {
    // ---------- Original NSDi3 path ----------
    const visInputs = inputs as VisibilityInput[];
    let weightedSum = 0;
    let totalWeight = 0;

    const byEngine = visInputs.map(input => {
      const rawScore = input.totalKeywordsQueried > 0
        ? (input.keywordsWithBrandCitation / input.totalKeywordsQueried) * 100
        : 0;
      const weight = ENGINE_WEIGHTS[input.engine] || 1.0;
      const weighted = rawScore * weight;
      weightedSum += weighted;
      totalWeight += weight;
      return { engine: input.engine, score: rawScore, weight, weighted };
    });

    const overall = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const rounded = Math.round(overall * 10) / 10;
    return { overall: rounded, score: rounded, byEngine };
  }

  // ---------- Consumer / compat path ----------
  const engineInputs = inputs as EngineVisibilityInput[];
  let totalCited = 0;
  let totalKeywords = 0;

  for (const input of engineInputs) {
    totalCited += input.keywordsCited;
    totalKeywords += input.totalKeywords;
  }

  const raw = totalKeywords > 0 ? (totalCited / totalKeywords) * 100 : 0;
  const score = Math.round(raw * 10) / 10;
  return { score, overall: score, byEngine: [] };
}

// ============================================
// CITATION CONFIDENCE
// ============================================

/**
 * Calculates citation confidence for a keyword+engine pair.
 *
 * confidence = (runsWithCitation / totalRuns) * 100
 *
 * Only meaningful when runsPerKeyword > 1 (starter/growth tiers).
 */
export function calculateCitationConfidence(params: {
  totalRuns: number;
  runsWithCitation: number;
}): number;
export function calculateCitationConfidence(runsWithCitation: number, totalRuns: number): number;
export function calculateCitationConfidence(
  paramsOrRunsWithCitation: { totalRuns: number; runsWithCitation: number } | number,
  totalRunsArg?: number,
): number {
  if (typeof paramsOrRunsWithCitation === 'number') {
    const runsWithCitation = paramsOrRunsWithCitation;
    const totalRuns = totalRunsArg ?? 0;
    if (totalRuns === 0) return 0;
    return Math.round((runsWithCitation / totalRuns) * 100 * 10) / 10;
  }
  const params = paramsOrRunsWithCitation;
  if (params.totalRuns === 0) return 0;
  return Math.round((params.runsWithCitation / params.totalRuns) * 100 * 10) / 10;
}

// ============================================
// PROMINENCE SCORE
// ============================================

/**
 * Calculates a position-based prominence score for a citation.
 *
 * Position 1 = 1.0 (first citation, highest prominence)
 * Position 2 = 0.8
 * Position 3 = 0.6
 * Position 4+ = 0.4
 * No position data = 0.5 (default)
 */
export function calculateProminenceScore(position: number | null): number {
  if (position === null) return 0.5;
  if (position === 1) return 1.0;
  if (position === 2) return 0.8;
  if (position === 3) return 0.6;
  return 0.4; // position >= 4
}

// ============================================
// SHARE OF VOICE
// ============================================

/**
 * Calculates Share of Voice across brand and competitor citations.
 *
 * share_of_voice = (brand_citations / total_citations) * 100
 *
 * Returns 0 when no citations exist (not 100), since there's no voice to share.
 *
 * --- Overload 1 (NSDi3 / original) ---
 * Accepts an object with brandCitations + competitorCitations array.
 * Returns { brandShare, competitorShares, totalCitations }.
 *
 * --- Overload 2 (consumer / compat) ---
 * Accepts two positional args: brandCount and an array of competitor counts.
 * Returns { shareOfVoice }.
 */
export function calculateShareOfVoice(params: {
  brandCitations: number;
  competitorCitations: { competitorId: string; count: number }[];
}): {
  brandShare: number;
  competitorShares: { competitorId: string; share: number }[];
  totalCitations: number;
};
export function calculateShareOfVoice(brandCount: number, compCounts: { competitorId: string; count: number }[]): {
  shareOfVoice: number;
};
export function calculateShareOfVoice(
  paramsOrBrandCount:
    | { brandCitations: number; competitorCitations: { competitorId: string; count: number }[] }
    | number,
  compCounts?: { competitorId: string; count: number }[],
): {
  brandShare?: number;
  competitorShares?: { competitorId: string; share: number }[];
  totalCitations?: number;
  shareOfVoice?: number;
} {
  if (typeof paramsOrBrandCount === 'number') {
    // ---------- Consumer / compat path (2-arg) ----------
    const brandCount = paramsOrBrandCount;
    const counts = compCounts ?? [];
    const totalCompetitor = counts.reduce((sum, c) => sum + c.count, 0);
    const total = brandCount + totalCompetitor;
    const shareOfVoice = total > 0
      ? Math.round((brandCount / total) * 100 * 10) / 10
      : 0;
    return { shareOfVoice, brandShare: shareOfVoice, competitorShares: [], totalCitations: total };
  }

  // ---------- Original NSDi3 path (object) ----------
  const params = paramsOrBrandCount;
  const totalCompetitor = params.competitorCitations.reduce((sum, c) => sum + c.count, 0);
  const totalCitations = params.brandCitations + totalCompetitor;

  if (totalCitations === 0) {
    return { brandShare: 0, competitorShares: [], totalCitations: 0, shareOfVoice: 0 };
  }

  const brandShare = Math.round((params.brandCitations / totalCitations) * 100 * 10) / 10;
  const competitorShares = params.competitorCitations.map(c => ({
    competitorId: c.competitorId,
    share: Math.round((c.count / totalCitations) * 100 * 10) / 10,
  }));

  return { brandShare, competitorShares, totalCitations, shareOfVoice: brandShare };
}

// ============================================
// TREND
// ============================================

/**
 * Calculates the percentage change between two values.
 *
 * trend = ((current - previous) / previous) * 100
 *
 * Returns 0 when previous is 0 and current is also 0.
 * Returns 100 when previous is 0 but current is positive.
 */
export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}
