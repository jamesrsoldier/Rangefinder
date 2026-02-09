import type { EngineType } from '@/types';
import { EngineAdapter, EngineResponse, buildQueryPrompt } from './types';

// Realistic sample domains and pages for mock responses
const SAMPLE_SITES = [
  { domain: 'techcrunch.com', pages: ['/2025/best-tools', '/reviews/software'] },
  { domain: 'g2.com', pages: ['/categories/crm', '/products/compare'] },
  { domain: 'forbes.com', pages: ['/advisor/business/software'] },
  { domain: 'pcmag.com', pages: ['/picks/best-software'] },
  { domain: 'capterra.com', pages: ['/reviews', '/compare'] },
  { domain: 'trustpilot.com', pages: ['/review'] },
  { domain: 'reddit.com', pages: ['/r/software/comments/best'] },
  { domain: 'wikipedia.org', pages: ['/wiki/'] },
];

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  };
}

/**
 * Mock engine adapter for testing the full pipeline without API costs.
 *
 * Generates deterministic, realistic-looking AI responses with citations.
 * The same keyword + engine combo always produces the same output so
 * results are reproducible across runs.
 *
 * Toggle on via USE_MOCK_ENGINE=true in .env.local.
 * Remove the env var to switch to real engines.
 */
export class MockAdapter implements EngineAdapter {
  engineType: EngineType;

  constructor(engineType: EngineType) {
    this.engineType = engineType;
  }

  async query(keyword: string): Promise<EngineResponse> {
    const start = Date.now();
    const prompt = buildQueryPrompt(keyword);
    const rand = seededRandom(`${this.engineType}:${keyword}`);

    // Simulate network latency (50-300ms)
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.floor(rand() * 250)));

    // Pick 3-6 citation URLs (deterministic based on keyword+engine)
    const citationCount = 3 + Math.floor(rand() * 4);
    const citations: string[] = [];
    const usedDomains = new Set<string>();

    for (let i = 0; i < citationCount && i < SAMPLE_SITES.length; i++) {
      const idx = Math.floor(rand() * SAMPLE_SITES.length);
      const site = SAMPLE_SITES[idx];
      if (usedDomains.has(site.domain)) continue;
      usedDomains.add(site.domain);
      const page = site.pages[Math.floor(rand() * site.pages.length)];
      citations.push(`https://${site.domain}${page}`);
    }

    // Build a realistic-looking response text
    const responseText = this.buildMockResponse(prompt, citations, rand);

    return {
      engineType: this.engineType,
      rawResponse: responseText,
      citationUrls: citations,
      responseMetadata: {
        model: `mock-${this.engineType}`,
        tokensUsed: 200 + Math.floor(rand() * 300),
        latencyMs: Date.now() - start,
      },
    };
  }

  private buildMockResponse(
    prompt: string,
    citations: string[],
    rand: () => number,
  ): string {
    const intros = [
      `Based on current analysis and expert reviews, here's what you need to know about "${prompt}":`,
      `There are several highly-rated options when it comes to "${prompt}". Here's an overview:`,
      `When evaluating "${prompt}", experts and users consistently highlight these key points:`,
    ];

    const midSections = [
      'According to industry analysts, the market leaders in this space offer a strong combination of features, reliability, and customer support.',
      'Recent reviews indicate that users prioritize ease of use, integration capabilities, and pricing transparency when making their decision.',
      'Competitive analysis shows significant differentiation in areas like AI-powered features, scalability, and enterprise readiness.',
    ];

    const closings = [
      'For the most up-to-date comparisons, consulting recent user reviews and analyst reports is recommended.',
      'The best choice depends on your specific needs, budget, and existing technology stack.',
      'Consider starting with free trials to evaluate which solution best fits your workflow.',
    ];

    const intro = intros[Math.floor(rand() * intros.length)];
    const mid = midSections[Math.floor(rand() * midSections.length)];
    const closing = closings[Math.floor(rand() * closings.length)];

    const citationRefs = citations
      .map((url, i) => `[${i + 1}] ${url}`)
      .join('\n');

    return `${intro}\n\n${mid}\n\n${closing}\n\nSources:\n${citationRefs}`;
  }
}
