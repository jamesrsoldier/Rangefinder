import { describe, it, expect } from 'vitest';
import {
  getPlanLimits,
  canAddKeywords,
  canAddProject,
  canAddCompetitor,
  canUseEngine,
  canUseGA4,
  canUseGSC,
} from '@/lib/billing/plan-limits';

describe('getPlanLimits', () => {
  it('returns correct limits for free tier', () => {
    const limits = getPlanLimits('free');
    expect(limits.maxKeywords).toBe(10);
    expect(limits.maxProjects).toBe(1);
    expect(limits.maxCompetitors).toBe(1);
    expect(limits.engines).toEqual(['perplexity']);
    expect(limits.ga4Integration).toBe(false);
    expect(limits.gscIntegration).toBe(false);
  });

  it('returns correct limits for starter tier', () => {
    const limits = getPlanLimits('starter');
    expect(limits.maxKeywords).toBe(100);
    expect(limits.maxProjects).toBe(2);
    expect(limits.maxCompetitors).toBe(3);
    expect(limits.engines).toContain('google_ai_overview');
    expect(limits.ga4Integration).toBe(true);
    expect(limits.gscIntegration).toBe(false);
  });

  it('returns correct limits for growth tier', () => {
    const limits = getPlanLimits('growth');
    expect(limits.maxKeywords).toBe(500);
    expect(limits.maxProjects).toBe(5);
    expect(limits.maxCompetitors).toBe(10);
    expect(limits.engines).toHaveLength(5);
    expect(limits.ga4Integration).toBe(true);
    expect(limits.gscIntegration).toBe(true);
    expect(limits.apiAccess).toBe(true);
  });
});

describe('canAddKeywords', () => {
  it('allows adding keywords within limit', () => {
    expect(canAddKeywords('free', 5, 3)).toBe(true);
  });

  it('allows adding keywords up to exact limit', () => {
    expect(canAddKeywords('free', 8, 2)).toBe(true);
  });

  it('rejects adding keywords over limit', () => {
    expect(canAddKeywords('free', 9, 2)).toBe(false);
  });

  it('respects tier-specific limits', () => {
    expect(canAddKeywords('starter', 95, 5)).toBe(true);
    expect(canAddKeywords('starter', 95, 6)).toBe(false);
  });
});

describe('canAddProject', () => {
  it('allows adding project within limit', () => {
    expect(canAddProject('free', 0)).toBe(true);
  });

  it('rejects adding project at limit', () => {
    expect(canAddProject('free', 1)).toBe(false);
  });

  it('allows growth tier up to 5 projects', () => {
    expect(canAddProject('growth', 4)).toBe(true);
    expect(canAddProject('growth', 5)).toBe(false);
  });
});

describe('canAddCompetitor', () => {
  it('allows adding competitor within limit', () => {
    expect(canAddCompetitor('free', 0)).toBe(true);
  });

  it('rejects adding competitor at limit', () => {
    expect(canAddCompetitor('free', 1)).toBe(false);
  });

  it('allows growth tier up to 10 competitors', () => {
    expect(canAddCompetitor('growth', 9)).toBe(true);
    expect(canAddCompetitor('growth', 10)).toBe(false);
  });
});

describe('canUseEngine', () => {
  it('free tier only allows perplexity', () => {
    expect(canUseEngine('free', 'perplexity')).toBe(true);
    expect(canUseEngine('free', 'google_ai_overview')).toBe(false);
    expect(canUseEngine('free', 'chatgpt')).toBe(false);
    expect(canUseEngine('free', 'bing_copilot')).toBe(false);
    expect(canUseEngine('free', 'claude')).toBe(false);
  });

  it('starter tier allows 3 engines', () => {
    expect(canUseEngine('starter', 'perplexity')).toBe(true);
    expect(canUseEngine('starter', 'google_ai_overview')).toBe(true);
    expect(canUseEngine('starter', 'chatgpt')).toBe(true);
    expect(canUseEngine('starter', 'bing_copilot')).toBe(false);
  });

  it('growth tier allows all engines', () => {
    expect(canUseEngine('growth', 'perplexity')).toBe(true);
    expect(canUseEngine('growth', 'google_ai_overview')).toBe(true);
    expect(canUseEngine('growth', 'chatgpt')).toBe(true);
    expect(canUseEngine('growth', 'bing_copilot')).toBe(true);
    expect(canUseEngine('growth', 'claude')).toBe(true);
  });
});

describe('canUseGA4', () => {
  it('free tier cannot use GA4', () => {
    expect(canUseGA4('free')).toBe(false);
  });

  it('starter tier can use GA4', () => {
    expect(canUseGA4('starter')).toBe(true);
  });

  it('growth tier can use GA4', () => {
    expect(canUseGA4('growth')).toBe(true);
  });
});

describe('canUseGSC', () => {
  it('free tier cannot use GSC', () => {
    expect(canUseGSC('free')).toBe(false);
  });

  it('starter tier cannot use GSC', () => {
    expect(canUseGSC('starter')).toBe(false);
  });

  it('growth tier can use GSC', () => {
    expect(canUseGSC('growth')).toBe(true);
  });
});
