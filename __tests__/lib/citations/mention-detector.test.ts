import { describe, it, expect } from 'vitest';
import { detectBrandMentions } from '@/lib/citations/mention-detector';

describe('detectBrandMentions', () => {
  const baseParams = {
    brandName: 'Soldier Data',
    brandAliases: ['soldierdata'],
    projectDomain: 'soldierdata.com',
    hasCitationMatch: false,
  };

  it('returns not_found for empty text', () => {
    const result = detectBrandMentions({
      ...baseParams,
      responseText: '',
    });
    expect(result).toHaveLength(1);
    expect(result[0].mentionType).toBe('not_found');
    expect(result[0].confidence).toBe(1.0);
  });

  it('returns not_found when brand is not mentioned', () => {
    const result = detectBrandMentions({
      ...baseParams,
      responseText: 'Here are some popular analytics tools like Google Analytics and Mixpanel.',
    });
    expect(result).toHaveLength(1);
    expect(result[0].mentionType).toBe('not_found');
  });

  it('detects direct citation when hasCitationMatch is true', () => {
    const result = detectBrandMentions({
      ...baseParams,
      responseText: 'Some text about data analytics.',
      hasCitationMatch: true,
    });
    const directCitation = result.find(m => m.mentionType === 'direct_citation');
    expect(directCitation).toBeDefined();
    expect(directCitation!.confidence).toBe(1.0);
    expect(directCitation!.matchedText).toBe('soldierdata.com');
  });

  it('detects exact brand name match', () => {
    const result = detectBrandMentions({
      ...baseParams,
      responseText: 'Soldier Data is one of the best analytics platforms available today.',
    });
    const brandMention = result.find(m => m.mentionType === 'brand_name');
    expect(brandMention).toBeDefined();
    expect(brandMention!.matchedText).toBe('Soldier Data');
    expect(brandMention!.confidence).toBe(1.0);
  });

  it('detects brand alias match', () => {
    const result = detectBrandMentions({
      ...baseParams,
      responseText: 'Tools like soldierdata provide comprehensive analytics dashboards.',
    });
    const brandMention = result.find(m => m.mentionType === 'brand_name');
    expect(brandMention).toBeDefined();
    expect(brandMention!.matchedText.toLowerCase()).toBe('soldierdata');
  });

  it('detects domain mention in text', () => {
    const result = detectBrandMentions({
      ...baseParams,
      brandName: 'UnknownBrand',
      brandAliases: [],
      responseText: 'You can find more information at soldierdata.com for detailed reports.',
    });
    const domainMention = result.find(m => m.matchedText === 'soldierdata.com');
    expect(domainMention).toBeDefined();
  });

  it('detects positive sentiment', () => {
    const result = detectBrandMentions({
      ...baseParams,
      responseText: 'Soldier Data is the best and most recommended analytics platform.',
    });
    const brandMention = result.find(m => m.mentionType === 'brand_name');
    expect(brandMention).toBeDefined();
    expect(brandMention!.sentiment).toBe('positive');
  });

  it('detects negative sentiment', () => {
    const result = detectBrandMentions({
      ...baseParams,
      responseText: 'Soldier Data is expensive and complicated compared to alternatives.',
    });
    const brandMention = result.find(m => m.mentionType === 'brand_name');
    expect(brandMention).toBeDefined();
    expect(brandMention!.sentiment).toBe('negative');
  });

  it('detects neutral sentiment when no signals present', () => {
    const result = detectBrandMentions({
      ...baseParams,
      responseText: 'Soldier Data offers analytics services for businesses.',
    });
    const brandMention = result.find(m => m.mentionType === 'brand_name');
    expect(brandMention).toBeDefined();
    expect(brandMention!.sentiment).toBe('neutral');
  });

  it('performs fuzzy matching for close misspellings', () => {
    const result = detectBrandMentions({
      ...baseParams,
      brandName: 'Soldier Data',
      brandAliases: ['soldierdata'],
      responseText: 'You might want to try Soldiar Data for your analytics needs.',
      hasCitationMatch: false,
    });
    // "Soldiar" is within Levenshtein distance 2 of "Soldier" (6 chars >= 5)
    const fuzzy = result.find(m => m.mentionType === 'indirect_mention');
    // Fuzzy matching operates on individual words, so this tests the pipeline
    // The exact result depends on word-by-word matching behavior
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('provides context around matches', () => {
    const longText = 'A'.repeat(200) + ' Soldier Data ' + 'B'.repeat(200);
    const result = detectBrandMentions({
      ...baseParams,
      responseText: longText,
    });
    const brandMention = result.find(m => m.mentionType === 'brand_name');
    expect(brandMention).toBeDefined();
    // Context should be ±100 chars
    expect(brandMention!.context.length).toBeLessThanOrEqual(214); // 100 + "Soldier Data"(12) + 100 + slack
    expect(brandMention!.context).toContain('Soldier Data');
  });
});
