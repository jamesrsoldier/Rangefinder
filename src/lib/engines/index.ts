import { EngineType } from '@/types';
import { EngineAdapter } from './types';
import { PerplexityAdapter } from './perplexity';
import { DataForSeoAdapter } from './dataforseo';
import { MockAdapter } from './mock';

const adapters: Partial<Record<EngineType, () => EngineAdapter>> = {
  perplexity: () => new PerplexityAdapter(),
  google_ai_overview: () => new DataForSeoAdapter(),
  // chatgpt, bing_copilot, claude — not implemented in MVP
};

/**
 * Returns the engine adapter for the given engine type.
 *
 * When USE_MOCK_ENGINE=true is set in .env.local, all engines
 * return mock responses. This lets you test the full pipeline
 * (monitoring → citations → mentions → alerts → dashboard)
 * without any API keys or costs.
 *
 * Remove USE_MOCK_ENGINE to switch to real engines.
 */
export function getAdapter(engineType: EngineType): EngineAdapter {
  if (process.env.USE_MOCK_ENGINE === 'true') {
    return new MockAdapter(engineType);
  }

  const factory = adapters[engineType];
  if (!factory) {
    throw new Error(`Engine adapter not implemented: ${engineType}`);
  }
  return factory();
}

export function getAvailableEngines(): EngineType[] {
  if (process.env.USE_MOCK_ENGINE === 'true') {
    return ['perplexity', 'google_ai_overview', 'chatgpt', 'bing_copilot', 'claude'];
  }
  return Object.keys(adapters) as EngineType[];
}

export { type EngineAdapter, type EngineResponse } from './types';
export { buildQueryPrompt } from './types';
