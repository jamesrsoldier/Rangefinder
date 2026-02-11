import { describe, it, expect } from 'vitest';
import {
  calculateVisibilityScore,
  calculateCitationConfidence,
  calculateProminenceScore,
  calculateShareOfVoice,
  calculateTrend,
} from '@/lib/citations/scoring';

// ============================================
// VISIBILITY SCORE
// ============================================

describe('calculateVisibilityScore', () => {
  it('returns 0 for empty inputs', () => {
    const result = calculateVisibilityScore([]);
    expect(result.overall).toBe(0);
    expect(result.score).toBe(0);
  });

  it('calculates weighted score for original VisibilityInput format', () => {
    const result = calculateVisibilityScore([
      { engine: 'perplexity', keywordsWithBrandCitation: 3, totalKeywordsQueried: 5 },
      { engine: 'google_ai_overview', keywordsWithBrandCitation: 2, totalKeywordsQueried: 5 },
    ]);
    // perplexity: (3/5)*100 = 60, weight=1.0, weighted=60
    // google_ai_overview: (2/5)*100 = 40, weight=1.5, weighted=60
    // overall = (60+60) / (1.0+1.5) = 120/2.5 = 48
    expect(result.overall).toBe(48);
    expect(result.byEngine).toHaveLength(2);
    expect(result.byEngine![0].engine).toBe('perplexity');
    expect(result.byEngine![0].score).toBe(60);
    expect(result.byEngine![1].engine).toBe('google_ai_overview');
    expect(result.byEngine![1].weight).toBe(1.5);
  });

  it('calculates simple score for EngineVisibilityInput format', () => {
    const result = calculateVisibilityScore([
      { keywordsCited: 8, totalKeywords: 10 },
    ]);
    expect(result.score).toBe(80);
  });

  it('handles zero total keywords', () => {
    const result = calculateVisibilityScore([
      { engine: 'perplexity', keywordsWithBrandCitation: 0, totalKeywordsQueried: 0 },
    ]);
    expect(result.overall).toBe(0);
  });

  it('gives Google AI Overview 1.5x weight', () => {
    // Same raw scores, but google_ai_overview has more influence
    const result = calculateVisibilityScore([
      { engine: 'perplexity', keywordsWithBrandCitation: 5, totalKeywordsQueried: 10 },
      { engine: 'google_ai_overview', keywordsWithBrandCitation: 10, totalKeywordsQueried: 10 },
    ]);
    // perplexity: 50*1.0=50, google: 100*1.5=150
    // overall = 200/2.5 = 80
    expect(result.overall).toBe(80);
  });
});

// ============================================
// CITATION CONFIDENCE
// ============================================

describe('calculateCitationConfidence', () => {
  it('returns 0 when totalRuns is 0 (object form)', () => {
    expect(calculateCitationConfidence({ totalRuns: 0, runsWithCitation: 0 })).toBe(0);
  });

  it('calculates percentage (object form)', () => {
    expect(calculateCitationConfidence({ totalRuns: 10, runsWithCitation: 7 })).toBe(70);
  });

  it('returns 0 when totalRuns is 0 (positional form)', () => {
    expect(calculateCitationConfidence(5, 0)).toBe(0);
  });

  it('calculates percentage (positional form)', () => {
    expect(calculateCitationConfidence(3, 4)).toBe(75);
  });

  it('rounds to one decimal place', () => {
    // 1/3 = 33.333...% should round to 33.3
    expect(calculateCitationConfidence({ totalRuns: 3, runsWithCitation: 1 })).toBe(33.3);
  });
});

// ============================================
// PROMINENCE SCORE
// ============================================

describe('calculateProminenceScore', () => {
  it('returns 1.0 for position 1', () => {
    expect(calculateProminenceScore(1)).toBe(1.0);
  });

  it('returns 0.8 for position 2', () => {
    expect(calculateProminenceScore(2)).toBe(0.8);
  });

  it('returns 0.6 for position 3', () => {
    expect(calculateProminenceScore(3)).toBe(0.6);
  });

  it('returns 0.4 for position 4 or higher', () => {
    expect(calculateProminenceScore(4)).toBe(0.4);
    expect(calculateProminenceScore(10)).toBe(0.4);
    expect(calculateProminenceScore(100)).toBe(0.4);
  });

  it('returns 0.5 for null position', () => {
    expect(calculateProminenceScore(null)).toBe(0.5);
  });
});

// ============================================
// SHARE OF VOICE
// ============================================

describe('calculateShareOfVoice', () => {
  it('returns 0 when no citations exist (object form)', () => {
    const result = calculateShareOfVoice({
      brandCitations: 0,
      competitorCitations: [],
    });
    expect(result.brandShare).toBe(0);
    expect(result.totalCitations).toBe(0);
  });

  it('calculates brand share correctly (object form)', () => {
    const result = calculateShareOfVoice({
      brandCitations: 5,
      competitorCitations: [
        { competitorId: 'comp1', count: 3 },
        { competitorId: 'comp2', count: 2 },
      ],
    });
    // brand: 5/10 = 50%
    expect(result.brandShare).toBe(50);
    expect(result.totalCitations).toBe(10);
    expect(result.competitorShares).toHaveLength(2);
    expect(result.competitorShares![0].share).toBe(30); // 3/10
    expect(result.competitorShares![1].share).toBe(20); // 2/10
  });

  it('calculates share of voice (positional form)', () => {
    const result = calculateShareOfVoice(7, [
      { competitorId: 'comp1', count: 3 },
    ]);
    // 7/10 = 70%
    expect(result.shareOfVoice).toBe(70);
  });

  it('returns 100% when brand has all citations', () => {
    const result = calculateShareOfVoice({
      brandCitations: 10,
      competitorCitations: [],
    });
    expect(result.brandShare).toBe(100);
  });
});

// ============================================
// TREND
// ============================================

describe('calculateTrend', () => {
  it('returns 0 when both values are 0', () => {
    expect(calculateTrend(0, 0)).toBe(0);
  });

  it('returns 100 when previous is 0 and current is positive', () => {
    expect(calculateTrend(50, 0)).toBe(100);
  });

  it('calculates positive trend', () => {
    // (80 - 50) / 50 * 100 = 60%
    expect(calculateTrend(80, 50)).toBe(60);
  });

  it('calculates negative trend', () => {
    // (30 - 50) / 50 * 100 = -40%
    expect(calculateTrend(30, 50)).toBe(-40);
  });

  it('returns 0 for no change', () => {
    expect(calculateTrend(50, 50)).toBe(0);
  });

  it('rounds to one decimal place', () => {
    // (1 - 3) / 3 * 100 = -66.666...% -> -66.7
    expect(calculateTrend(1, 3)).toBe(-66.7);
  });
});
