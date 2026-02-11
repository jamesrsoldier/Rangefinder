import { describe, it, expect } from 'vitest';
import { extractCitations, classifyCitations } from '@/lib/citations/extractor';

// ============================================
// EXTRACT CITATIONS
// ============================================

describe('extractCitations', () => {
  it('extracts structured citations with correct positions', () => {
    const result = extractCitations({
      structuredCitations: [
        'https://example.com/page1',
        'https://example.com/page2',
      ],
      rawResponseText: '',
    });
    expect(result).toHaveLength(2);
    expect(result[0].position).toBe(1);
    expect(result[0].source).toBe('structured');
    expect(result[1].position).toBe(2);
  });

  it('extracts URLs from raw text', () => {
    const result = extractCitations({
      structuredCitations: [],
      rawResponseText: 'Check out https://blog.example.com/article for more info.',
    });
    expect(result).toHaveLength(1);
    expect(result[0].domain).toBe('blog.example.com');
    expect(result[0].source).toBe('text_extracted');
  });

  it('deduplicates URLs across structured and text', () => {
    const result = extractCitations({
      structuredCitations: ['https://example.com/page'],
      rawResponseText: 'See https://example.com/page for details.',
    });
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('structured');
  });

  it('removes tracking parameters during normalization', () => {
    const result = extractCitations({
      structuredCitations: ['https://example.com/page?utm_source=ai&utm_medium=ref'],
      rawResponseText: '',
    });
    expect(result[0].url).toBe('https://example.com/page');
  });

  it('removes trailing slashes during normalization', () => {
    const result = extractCitations({
      structuredCitations: ['https://example.com/page/'],
      rawResponseText: '',
    });
    expect(result[0].url).toBe('https://example.com/page');
  });

  it('handles empty inputs', () => {
    const result = extractCitations({
      structuredCitations: [],
      rawResponseText: '',
    });
    expect(result).toHaveLength(0);
  });

  it('prioritizes structured citations over text URLs', () => {
    const result = extractCitations({
      structuredCitations: ['https://first.com'],
      rawResponseText: 'Also see https://second.com and https://third.com',
    });
    expect(result).toHaveLength(3);
    expect(result[0].url).toContain('first.com');
    expect(result[0].position).toBe(1);
    expect(result[1].position).toBe(2);
    expect(result[2].position).toBe(3);
  });

  it('extracts domain correctly from URLs', () => {
    const result = extractCitations({
      structuredCitations: ['https://www.example.com/page'],
      rawResponseText: '',
    });
    expect(result[0].domain).toBe('example.com');
  });
});

// ============================================
// CLASSIFY CITATIONS
// ============================================

describe('classifyCitations', () => {
  const baseCitation = {
    url: 'https://example.com/page',
    domain: 'example.com',
    position: 1,
    source: 'structured' as const,
  };

  it('identifies brand citations by exact domain match', () => {
    const result = classifyCitations({
      citations: [baseCitation],
      projectDomain: 'example.com',
      competitors: [],
    });
    expect(result[0].isBrandCitation).toBe(true);
    expect(result[0].matchedCompetitorId).toBeNull();
  });

  it('identifies brand citations with www prefix', () => {
    const result = classifyCitations({
      citations: [{ ...baseCitation, domain: 'www.example.com' }],
      projectDomain: 'example.com',
      competitors: [],
    });
    expect(result[0].isBrandCitation).toBe(true);
  });

  it('identifies brand citations by subdomain match', () => {
    const result = classifyCitations({
      citations: [{ ...baseCitation, domain: 'blog.example.com' }],
      projectDomain: 'example.com',
      competitors: [],
    });
    expect(result[0].isBrandCitation).toBe(true);
  });

  it('identifies competitor citations', () => {
    const result = classifyCitations({
      citations: [{ ...baseCitation, domain: 'competitor.com' }],
      projectDomain: 'example.com',
      competitors: [{ id: 'comp1', domain: 'competitor.com' }],
    });
    expect(result[0].isBrandCitation).toBe(false);
    expect(result[0].matchedCompetitorId).toBe('comp1');
  });

  it('identifies competitor citations by subdomain', () => {
    const result = classifyCitations({
      citations: [{ ...baseCitation, domain: 'blog.competitor.com' }],
      projectDomain: 'example.com',
      competitors: [{ id: 'comp1', domain: 'competitor.com' }],
    });
    expect(result[0].matchedCompetitorId).toBe('comp1');
  });

  it('returns null competitorId for unmatched domains', () => {
    const result = classifyCitations({
      citations: [{ ...baseCitation, domain: 'unrelated.com' }],
      projectDomain: 'example.com',
      competitors: [{ id: 'comp1', domain: 'competitor.com' }],
    });
    expect(result[0].isBrandCitation).toBe(false);
    expect(result[0].matchedCompetitorId).toBeNull();
  });

  it('handles case-insensitive domain matching', () => {
    const result = classifyCitations({
      citations: [{ ...baseCitation, domain: 'Example.COM' }],
      projectDomain: 'EXAMPLE.com',
      competitors: [],
    });
    expect(result[0].isBrandCitation).toBe(true);
  });
});
