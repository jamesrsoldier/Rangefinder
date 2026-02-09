import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  real,
  date,
  jsonb,
  unique,
  index,
} from 'drizzle-orm/pg-core';

import {
  subscriptionTierEnum,
  subscriptionStatusEnum,
  engineTypeEnum,
  queryRunStatusEnum,
  mentionTypeEnum,
  sentimentTypeEnum,
  alertTypeEnum,
  alertChannelEnum,
} from './enums';

// ============================================
// USERS & ORGANIZATIONS
// ============================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  imageUrl: text('image_url'),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  subscriptionTier: subscriptionTierEnum('subscription_tier').notNull().default('free'),
  subscriptionStatus: subscriptionStatusEnum('subscription_status').notNull().default('active'),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueMember: unique().on(table.organizationId, table.userId),
}));

// ============================================
// PROJECTS
// ============================================

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  brandName: text('brand_name').notNull(),
  brandAliases: text('brand_aliases').array(),
  googleAccessToken: text('google_access_token'),
  googleRefreshToken: text('google_refresh_token'),
  googleTokenExpiry: timestamp('google_token_expiry', { withTimezone: true }),
  ga4PropertyId: text('ga4_property_id'),
  gscSiteUrl: text('gsc_site_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// KEYWORDS & MONITORING
// ============================================

export const trackedKeywords = pgTable('tracked_keywords', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  keyword: text('keyword').notNull(),
  category: text('category'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueKeyword: unique().on(table.projectId, table.keyword),
  idxProjectActive: index('idx_keywords_project_active').on(table.projectId, table.isActive),
}));

export const queryRuns = pgTable('query_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  status: queryRunStatusEnum('status').notNull().default('pending'),
  engineTypes: engineTypeEnum('engine_types').array().notNull(),
  totalKeywords: integer('total_keywords').notNull().default(0),
  completedKeywords: integer('completed_keywords').notNull().default(0),
  failedKeywords: integer('failed_keywords').notNull().default(0),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  idxProjectCreated: index('idx_queryruns_project_created').on(table.projectId, table.createdAt),
}));

export const queryResults = pgTable('query_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  queryRunId: uuid('query_run_id').notNull().references(() => queryRuns.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  keywordId: uuid('keyword_id').notNull().references(() => trackedKeywords.id, { onDelete: 'cascade' }),
  engineType: engineTypeEnum('engine_type').notNull(),
  rawResponse: text('raw_response').notNull(),
  responseMetadata: jsonb('response_metadata'),
  citationUrls: text('citation_urls').array(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  idxRunEngine: index('idx_queryresults_run_engine').on(table.queryRunId, table.engineType),
  idxProjectKeyword: index('idx_queryresults_project_keyword').on(table.projectId, table.keywordId),
}));

// ============================================
// CITATIONS & BRAND MENTIONS
// ============================================

export const citations = pgTable('citations', {
  id: uuid('id').primaryKey().defaultRandom(),
  queryResultId: uuid('query_result_id').notNull().references(() => queryResults.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  keywordId: uuid('keyword_id').notNull().references(() => trackedKeywords.id, { onDelete: 'cascade' }),
  engineType: engineTypeEnum('engine_type').notNull(),
  citedUrl: text('cited_url').notNull(),
  citedDomain: text('cited_domain').notNull(),
  anchorText: text('anchor_text'),
  position: integer('position'),
  isBrandCitation: boolean('is_brand_citation').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  idxProjectBrand: index('idx_citations_project_brand').on(table.projectId, table.isBrandCitation),
  idxProjectEngine: index('idx_citations_project_engine').on(table.projectId, table.engineType),
  idxProjectKeywordCreated: index('idx_citations_project_kw_created').on(table.projectId, table.keywordId, table.createdAt),
}));

export const brandMentions = pgTable('brand_mentions', {
  id: uuid('id').primaryKey().defaultRandom(),
  queryResultId: uuid('query_result_id').notNull().references(() => queryResults.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  keywordId: uuid('keyword_id').notNull().references(() => trackedKeywords.id, { onDelete: 'cascade' }),
  engineType: engineTypeEnum('engine_type').notNull(),
  mentionType: mentionTypeEnum('mention_type').notNull(),
  matchedText: text('matched_text').notNull(),
  context: text('context'),
  confidence: real('confidence').notNull(),
  sentiment: sentimentTypeEnum('sentiment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  idxProjectMentionType: index('idx_mentions_project_type').on(table.projectId, table.mentionType),
  idxProjectKeywordCreated: index('idx_mentions_project_kw_created').on(table.projectId, table.keywordId, table.createdAt),
}));

// ============================================
// COMPETITORS
// ============================================

export const competitors = pgTable('competitors', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull(),
  name: text('name').notNull(),
  aliases: text('aliases').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueCompetitor: unique().on(table.projectId, table.domain),
}));

export const competitorCitations = pgTable('competitor_citations', {
  id: uuid('id').primaryKey().defaultRandom(),
  queryResultId: uuid('query_result_id').notNull().references(() => queryResults.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  competitorId: uuid('competitor_id').notNull().references(() => competitors.id, { onDelete: 'cascade' }),
  keywordId: uuid('keyword_id').notNull().references(() => trackedKeywords.id, { onDelete: 'cascade' }),
  engineType: engineTypeEnum('engine_type').notNull(),
  citedUrl: text('cited_url').notNull(),
  position: integer('position'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  idxProjectCompetitor: index('idx_compcite_project_competitor').on(table.projectId, table.competitorId),
}));

// ============================================
// ANALYTICS DATA (GA4 + GSC)
// ============================================

export const ga4TrafficData = pgTable('ga4_traffic_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  source: text('source').notNull(),
  medium: text('medium').notNull(),
  landingPage: text('landing_page'),
  sessions: integer('sessions').notNull().default(0),
  users: integer('users').notNull().default(0),
  engagedSessions: integer('engaged_sessions').notNull().default(0),
  conversions: integer('conversions').notNull().default(0),
  avgEngagementTime: real('avg_engagement_time'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  idxProjectDate: index('idx_ga4_project_date').on(table.projectId, table.date),
  uniqueRow: unique().on(table.projectId, table.date, table.source, table.medium, table.landingPage),
}));

export const gscData = pgTable('gsc_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  query: text('query').notNull(),
  page: text('page').notNull(),
  clicks: integer('clicks').notNull().default(0),
  impressions: integer('impressions').notNull().default(0),
  ctr: real('ctr').notNull().default(0),
  position: real('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  idxProjectDate: index('idx_gsc_project_date').on(table.projectId, table.date),
  uniqueRow: unique().on(table.projectId, table.date, table.query, table.page),
}));

// ============================================
// ALERTS
// ============================================

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  alertType: alertTypeEnum('alert_type').notNull(),
  channel: alertChannelEnum('alert_channel').notNull().default('in_app'),
  threshold: real('threshold'),
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const alertEvents = pgTable('alert_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertId: uuid('alert_id').notNull().references(() => alerts.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  metadata: jsonb('metadata'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  idxProjectRead: index('idx_alertevents_project_read').on(table.projectId, table.isRead),
}));
