import type { AnalysisData, OptimizationScoreData } from './types';

/**
 * Calculates the optimization score for a project based on analysis data.
 *
 * Overall = (contentCoverage × 0.35) + (competitiveGap × 0.25)
 *         + (citationConsistency × 0.25) + (freshness × 0.15)
 *
 * Each sub-score is 0-100.
 */
export function calculateOptimizationScore(data: AnalysisData): OptimizationScoreData {
  const contentCoverage = calculateContentCoverage(data);
  const competitiveGap = calculateCompetitiveGap(data);
  const citationConsistency = calculateCitationConsistency(data);
  const freshness = calculateFreshness(data);

  const overall =
    contentCoverage * 0.35 +
    competitiveGap * 0.25 +
    citationConsistency * 0.25 +
    freshness * 0.15;

  return {
    overallScore: Math.round(overall * 10) / 10,
    contentCoverage: Math.round(contentCoverage * 10) / 10,
    competitiveGap: Math.round(competitiveGap * 10) / 10,
    citationConsistency: Math.round(citationConsistency * 10) / 10,
    freshness: Math.round(freshness * 10) / 10,
  };
}

/**
 * Content Coverage: What percentage of keywords have brand citations?
 * 100 = all keywords cited, 0 = no keywords cited.
 */
function calculateContentCoverage(data: AnalysisData): number {
  if (data.totalKeywords === 0) return 0;
  return (data.keywordsWithBrandCitation / data.totalKeywords) * 100;
}

/**
 * Competitive Gap: How well positioned vs competitors?
 * 100 = no gaps (brand cited everywhere competitors are), 0 = competitors dominate.
 *
 * Calculated as: 100 - (keywordsWhereCompetitorCitedButBrandNot / totalKeywords * 100)
 */
function calculateCompetitiveGap(data: AnalysisData): number {
  if (data.totalKeywords === 0) return 100;

  const keywordsWithGap = data.keywordAnalyses.filter(
    ka => !ka.hasBrandCitation && ka.competitorCitations.length > 0,
  ).length;

  return Math.max(0, 100 - (keywordsWithGap / data.totalKeywords) * 100);
}

/**
 * Citation Consistency: How consistently is the brand cited across engines?
 * For each keyword that is cited, check how many engines cite it vs how many engines returned results.
 * Average across all keywords.
 */
function calculateCitationConsistency(data: AnalysisData): number {
  const citedKeywords = data.keywordAnalyses.filter(ka => ka.hasBrandCitation);
  if (citedKeywords.length === 0) return 0;

  let totalConsistency = 0;
  let countedKeywords = 0;
  for (const kw of citedKeywords) {
    if (kw.engines.length === 0) continue;
    const enginesCiting = kw.engines.filter(e => e.hasBrandCitation).length;
    totalConsistency += (enginesCiting / kw.engines.length) * 100;
    countedKeywords++;
  }

  // If no keywords had engine data, return 0 instead of dividing by 0
  if (countedKeywords === 0) return 0;

  return totalConsistency / countedKeywords;
}

/**
 * Freshness: Are citations being maintained over time?
 * 100 = no stale keywords (none lost citations), 0 = everything went stale.
 */
function calculateFreshness(data: AnalysisData): number {
  if (data.previousRunData.length === 0) {
    // No previous run to compare — assume fresh
    return 100;
  }

  const previouslyCited = data.previousRunData.filter(p => p.hasBrandCitation);
  if (previouslyCited.length === 0) return 100;

  const staleCount = previouslyCited.filter(prev => {
    const current = data.keywordAnalyses.find(ka => ka.keywordId === prev.keywordId);
    return current && !current.hasBrandCitation;
  }).length;

  return Math.max(0, 100 - (staleCount / previouslyCited.length) * 100);
}
