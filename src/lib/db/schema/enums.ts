import { pgEnum } from 'drizzle-orm/pg-core';

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'free', 'starter', 'growth'
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active', 'past_due', 'canceled', 'trialing', 'incomplete'
]);

export const engineTypeEnum = pgEnum('engine_type', [
  'perplexity', 'google_ai_overview', 'chatgpt', 'bing_copilot', 'claude'
]);

export const queryRunStatusEnum = pgEnum('query_run_status', [
  'pending', 'running', 'completed', 'failed', 'partial'
]);

export const mentionTypeEnum = pgEnum('mention_type', [
  'direct_citation', 'brand_name', 'indirect_mention', 'not_found'
]);

export const sentimentTypeEnum = pgEnum('sentiment_type', [
  'positive', 'neutral', 'negative'
]);

export const alertTypeEnum = pgEnum('alert_type', [
  'visibility_drop', 'visibility_increase', 'new_citation', 'lost_citation', 'competitor_change', 'negative_sentiment'
]);

export const alertChannelEnum = pgEnum('alert_channel', [
  'email', 'in_app'
]);

// ============================================
// OPTIMIZATION ENUMS
// ============================================

export const recommendationTypeEnum = pgEnum('recommendation_type', [
  'create_content',
  'update_content',
  'add_schema',
  'improve_structure',
  'add_comparison',
  'improve_authority',
  'optimize_citations',
]);

export const recommendationStatusEnum = pgEnum('recommendation_status', [
  'active',
  'dismissed',
  'completed',
  'expired',
]);

export const recommendationPriorityEnum = pgEnum('recommendation_priority', [
  'critical',
  'high',
  'medium',
  'low',
]);

export const analysisSourceEnum = pgEnum('analysis_source', [
  'rule_based',
  'ai_powered',
]);
