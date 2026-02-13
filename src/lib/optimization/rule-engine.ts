import type { RecommendationPriority } from '@/types';
import type {
  AnalysisData,
  KeywordAnalysis,
  GeneratedRecommendation,
  GeneratedContentGap,
  AnalysisResult,
} from './types';
import { calculateOptimizationScore } from './score-calculator';

// Base impact values by recommendation type
const BASE_IMPACT: Record<string, number> = {
  create_content: 15,
  update_content: 10,
  add_schema: 8,
  improve_structure: 6,
  add_comparison: 12,
  improve_authority: 7,
  optimize_citations: 5,
};

// Question/answer keyword patterns that benefit from schema markup
const FAQ_PATTERNS = /^(how to|what is|what are|why|when|where|which|can you|should i|do i need|best way to)/i;
const COMPARISON_PATTERNS = /\bvs\.?\b|\bversus\b|\bcompare\b|\bcomparison\b|\bbest\b|\btop\b/i;

/**
 * Run all rule-based analysis rules against the scan data.
 * Returns recommendations, content gaps, and optimization score.
 */
export function analyzeWithRules(data: AnalysisData): AnalysisResult {
  const recommendations: GeneratedRecommendation[] = [];
  const contentGaps: GeneratedContentGap[] = [];

  for (const kw of data.keywordAnalyses) {
    // Rule 1: No brand citation at all
    const rule1 = checkNoBrandCitation(kw, data);
    if (rule1) {
      recommendations.push(...rule1.recommendations);
      contentGaps.push(...rule1.contentGaps);
    }

    // Rule 2: Competitor cited but brand isn't
    const rule2 = checkCompetitorCitedBrandNot(kw, data);
    if (rule2) {
      recommendations.push(...rule2.recommendations);
      contentGaps.push(...rule2.contentGaps);
    }

    // Rule 3: Stale content (was cited, no longer)
    const rule3 = checkStaleContent(kw, data);
    if (rule3) {
      recommendations.push(...rule3.recommendations);
      contentGaps.push(...rule3.contentGaps);
    }

    // Rule 4: Low prominence (cited at position 4+)
    const rule4 = checkLowProminence(kw);
    if (rule4) {
      recommendations.push(...rule4.recommendations);
      contentGaps.push(...rule4.contentGaps);
    }

    // Rule 5: Single engine citation
    const rule5 = checkSingleEngineCitation(kw);
    if (rule5) {
      recommendations.push(...rule5.recommendations);
    }

    // Rule 6: Negative sentiment
    const rule6 = checkNegativeSentiment(kw);
    if (rule6) {
      recommendations.push(...rule6.recommendations);
    }

    // Rule 7: Missing schema hint for question keywords
    const rule7 = checkMissingSchemaHint(kw);
    if (rule7) {
      recommendations.push(...rule7.recommendations);
    }
  }

  // Deduplicate recommendations by (keywordId + type + competitorId)
  const deduped = deduplicateRecommendations(recommendations);

  const score = calculateOptimizationScore(data);

  return {
    recommendations: deduped,
    contentGaps,
    score,
  };
}

// ============================================
// RULE IMPLEMENTATIONS
// ============================================

interface RuleOutput {
  recommendations: GeneratedRecommendation[];
  contentGaps: GeneratedContentGap[];
}

/**
 * Rule 1: Keyword has zero brand citations across all engines.
 */
function checkNoBrandCitation(kw: KeywordAnalysis, data: AnalysisData): RuleOutput | null {
  if (kw.hasBrandCitation) return null;

  const hasCompetitor = kw.competitorCitations.length > 0;
  const impact = calculateImpact('create_content', kw, data);
  const priority = assignPriority(impact, hasCompetitor);

  const enginesMissing = kw.engines
    .filter(e => !e.hasBrandCitation)
    .map(e => e.engine);

  return {
    recommendations: [{
      keywordId: kw.keywordId,
      type: 'create_content',
      priority,
      source: 'rule_based',
      title: `Create content for "${kw.keyword}"`,
      description: `Your brand has no citations for this keyword across ${enginesMissing.length || 'any'} AI engine(s). ${hasCompetitor ? `${kw.competitorCitations.length} competitor(s) are being cited instead.` : 'Creating targeted content could establish visibility.'}`,
      actionableSteps: [
        `Research top-ranking content for "${kw.keyword}"`,
        'Create comprehensive, authoritative content addressing this topic',
        'Include structured data (FAQ schema, HowTo schema) where applicable',
        'Ensure content directly answers the query with specific data points',
        ...(hasCompetitor ? ['Analyze competitor content that is being cited for gaps you can fill'] : []),
      ],
      estimatedImpact: impact,
      metadata: {
        competitorsCited: kw.competitorCitations.length,
        enginesMissing,
      },
    }],
    contentGaps: [{
      keywordId: kw.keywordId,
      gapType: 'no_brand_citation',
      engineTypes: enginesMissing.length > 0 ? enginesMissing : [],
      severity: hasCompetitor ? 0.8 : 0.5,
      source: 'rule_based',
      metadata: { competitorsCited: kw.competitorCitations.length },
    }],
  };
}

/**
 * Rule 2: Competitor is cited for a keyword but the brand is not.
 * Creates per-competitor content gap entries.
 */
function checkCompetitorCitedBrandNot(kw: KeywordAnalysis, data: AnalysisData): RuleOutput | null {
  if (kw.hasBrandCitation || kw.competitorCitations.length === 0) return null;

  const recommendations: GeneratedRecommendation[] = [];
  const gaps: GeneratedContentGap[] = [];

  const isComparison = COMPARISON_PATTERNS.test(kw.keyword);

  for (const comp of kw.competitorCitations) {
    const impact = calculateImpact(
      isComparison ? 'add_comparison' : 'create_content',
      kw,
      data,
    );
    const priority = assignPriority(impact, true);

    recommendations.push({
      keywordId: kw.keywordId,
      type: isComparison ? 'add_comparison' : 'create_content',
      priority,
      source: 'rule_based',
      title: isComparison
        ? `Create comparison content vs ${comp.competitorName} for "${kw.keyword}"`
        : `Competitor ${comp.competitorName} is cited for "${kw.keyword}" — create competing content`,
      description: `${comp.competitorName} is cited ${comp.count} time(s) for this keyword. ${isComparison ? 'A comparison table or guide could help you get cited.' : 'You need content that directly addresses this query to compete.'}`,
      actionableSteps: [
        `Review ${comp.competitorName}'s cited content: ${comp.urls[0] || comp.competitorName}`,
        isComparison
          ? 'Create a detailed comparison page with tables, pros/cons, and data'
          : 'Create content that provides a more comprehensive answer',
        'Include unique data, statistics, or expert insights',
        'Add structured data markup (FAQ, comparison schema)',
      ],
      estimatedImpact: impact,
      competitorId: comp.competitorId,
      metadata: {
        competitorUrls: comp.urls,
        competitorCitationCount: comp.count,
      },
    });

    gaps.push({
      keywordId: kw.keywordId,
      gapType: 'competitor_only',
      competitorId: comp.competitorId,
      competitorUrl: comp.urls[0] || undefined,
      engineTypes: kw.engines
        .filter(e => !e.hasBrandCitation && e.competitorCitationCount > 0)
        .map(e => e.engine),
      severity: Math.min(0.9, 0.6 + comp.count * 0.1),
      source: 'rule_based',
      metadata: { competitorName: comp.competitorName },
    });
  }

  return { recommendations, contentGaps: gaps };
}

/**
 * Rule 3: Brand was cited in the previous run but not in the current one.
 */
function checkStaleContent(kw: KeywordAnalysis, data: AnalysisData): RuleOutput | null {
  if (kw.hasBrandCitation) return null;

  const prevData = data.previousRunData.find(p => p.keywordId === kw.keywordId);
  if (!prevData || !prevData.hasBrandCitation) return null;

  const impact = calculateImpact('update_content', kw, data);

  return {
    recommendations: [{
      keywordId: kw.keywordId,
      type: 'update_content',
      priority: 'high',
      source: 'rule_based',
      title: `Lost citation for "${kw.keyword}" — content may be stale`,
      description: `Your brand was previously cited for this keyword but is no longer appearing. This could indicate outdated content, or that competitors have published better alternatives.`,
      actionableSteps: [
        'Review your existing content for this topic',
        'Update statistics, dates, and references',
        'Add new information or insights that weren\'t in the original',
        'Verify that the page is still accessible and indexed',
        'Check if competitors have published newer content',
      ],
      estimatedImpact: impact,
      metadata: {
        previousCitationCount: prevData.brandCitationCount,
        lastCitedAt: prevData.lastCitedAt instanceof Date
          ? prevData.lastCitedAt.toISOString()
          : prevData.lastCitedAt ?? null,
      },
    }],
    contentGaps: [{
      keywordId: kw.keywordId,
      gapType: 'stale_content',
      brandLastCitedAt: prevData.lastCitedAt ?? undefined,
      engineTypes: kw.engines.filter(e => !e.hasBrandCitation).map(e => e.engine),
      severity: 0.7,
      source: 'rule_based',
      metadata: { previousCitationCount: prevData.brandCitationCount },
    } as GeneratedContentGap],
  };
}

/**
 * Rule 4: Brand is cited but at low positions (average position >= 4).
 */
function checkLowProminence(kw: KeywordAnalysis): RuleOutput | null {
  if (!kw.hasBrandCitation) return null;

  const validPositions = kw.brandCitationPositions.filter(
    (p): p is number => p !== null,
  );
  if (validPositions.length === 0) return null;

  const avgPosition = validPositions.reduce((a, b) => a + b, 0) / validPositions.length;
  if (avgPosition < 4) return null;

  return {
    recommendations: [{
      keywordId: kw.keywordId,
      type: 'improve_structure',
      priority: 'medium',
      source: 'rule_based',
      title: `Improve citation position for "${kw.keyword}"`,
      description: `Your brand is cited for this keyword but at an average position of ${avgPosition.toFixed(1)}. Higher positions get more visibility and clicks.`,
      actionableSteps: [
        'Make your content more directly answerable — put key info in the first paragraph',
        'Add structured data (FAQ schema, definition lists)',
        'Include comparison tables and data visualizations',
        'Ensure the page title and headings directly match the query intent',
      ],
      estimatedImpact: Math.max(3, 8 - avgPosition),
      metadata: { avgPosition, positions: validPositions },
    }],
    contentGaps: [{
      keywordId: kw.keywordId,
      gapType: 'low_prominence',
      engineTypes: kw.engines
        .filter(e => e.hasBrandCitation)
        .map(e => e.engine),
      severity: Math.min(0.6, avgPosition * 0.1),
      source: 'rule_based',
      metadata: { avgPosition },
    }],
  };
}

/**
 * Rule 5: Brand is cited on one engine but not on others.
 */
function checkSingleEngineCitation(kw: KeywordAnalysis): { recommendations: GeneratedRecommendation[] } | null {
  if (!kw.hasBrandCitation) return null;

  const citedEngines = kw.engines.filter(e => e.hasBrandCitation);
  const notCitedEngines = kw.engines.filter(e => !e.hasBrandCitation);

  if (citedEngines.length !== 1 || notCitedEngines.length < 1) return null;

  return {
    recommendations: [{
      keywordId: kw.keywordId,
      type: 'improve_authority',
      priority: 'medium',
      source: 'rule_based',
      title: `Expand visibility for "${kw.keyword}" beyond ${citedEngines[0].engine}`,
      description: `Your brand is only cited on ${citedEngines[0].engine} for this keyword but not on ${notCitedEngines.map(e => e.engine).join(', ')}. Improving E-E-A-T signals and content structure could help.`,
      actionableSteps: [
        'Strengthen author expertise signals (author bios, credentials)',
        'Add more external authoritative citations and references',
        'Improve content structure with clear headings and direct answers',
        'Ensure content is factual and includes verifiable data points',
      ],
      estimatedImpact: 5 + notCitedEngines.length * 2,
      metadata: {
        citedOn: citedEngines.map(e => e.engine),
        missingOn: notCitedEngines.map(e => e.engine),
      },
    }],
  };
}

/**
 * Rule 6: Brand mentions have negative sentiment.
 */
function checkNegativeSentiment(kw: KeywordAnalysis): { recommendations: GeneratedRecommendation[] } | null {
  if (kw.sentiment !== 'negative') return null;

  return {
    recommendations: [{
      keywordId: kw.keywordId,
      type: 'update_content',
      priority: 'high',
      source: 'rule_based',
      title: `Negative sentiment detected for "${kw.keyword}"`,
      description: `AI engines are mentioning your brand in a negative context for this keyword. This could impact brand perception and reduce the likelihood of favorable citations.`,
      actionableSteps: [
        'Review the AI engine responses mentioning your brand negatively',
        'Identify the source of negative information',
        'Create or update content that addresses the concerns raised',
        'Publish positive case studies, reviews, or testimonials',
        'Consider a PR or content strategy to shift the narrative',
      ],
      estimatedImpact: 12,
      metadata: { sentiment: 'negative', mentionCount: kw.brandMentionCount },
    }],
  };
}

/**
 * Rule 7: Question-pattern keywords with no brand citation — suggest schema.
 */
function checkMissingSchemaHint(kw: KeywordAnalysis): { recommendations: GeneratedRecommendation[] } | null {
  if (kw.hasBrandCitation) return null;
  if (!FAQ_PATTERNS.test(kw.keyword)) return null;

  return {
    recommendations: [{
      keywordId: kw.keywordId,
      type: 'add_schema',
      priority: 'medium',
      source: 'rule_based',
      title: `Add FAQ/HowTo schema for "${kw.keyword}"`,
      description: `This keyword has a question format that AI engines commonly pull from FAQ and HowTo structured data. Adding schema markup could significantly improve citation chances.`,
      actionableSteps: [
        `Create a page or section that directly answers "${kw.keyword}"`,
        'Add FAQ schema markup with the question and a concise answer',
        'If it\'s a "how to" keyword, add HowTo schema with step-by-step instructions',
        'Ensure the answer is factual, specific, and includes data points',
      ],
      estimatedImpact: 8,
      metadata: { pattern: 'question_keyword' },
    }],
  };
}

// ============================================
// HELPERS
// ============================================

function calculateImpact(
  type: string,
  kw: KeywordAnalysis,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  data: AnalysisData,
): number {
  const base = BASE_IMPACT[type] || 5;
  const competitorFactor = 1 + 0.2 * kw.competitorCitations.length;
  const totalEngines = Math.max(1, kw.engines.length);
  const enginesNotCiting = kw.engines.filter(e => !e.hasBrandCitation).length;
  const engineCoverage = totalEngines > 0 ? enginesNotCiting / totalEngines : 1;

  const impact = base * competitorFactor * (0.5 + engineCoverage * 0.5);
  return Math.round(Math.min(50, impact) * 10) / 10;
}

function assignPriority(impact: number, hasCompetitorCited: boolean): RecommendationPriority {
  if (impact >= 25 && hasCompetitorCited) return 'critical';
  if (impact >= 15) return 'high';
  if (impact >= 8) return 'medium';
  return 'low';
}

function deduplicateRecommendations(recs: GeneratedRecommendation[]): GeneratedRecommendation[] {
  const seen = new Set<string>();
  return recs.filter(r => {
    const key = `${r.keywordId ?? 'project'}-${r.type}-${r.competitorId ?? 'none'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
