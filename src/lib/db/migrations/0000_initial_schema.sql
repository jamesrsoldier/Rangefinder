-- Migration: 0000_initial_schema
-- Description: Create all tables, enums, and indexes for Rangefinder MVP
-- This is the initial migration that sets up the complete database schema.

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE "subscription_tier" AS ENUM ('free', 'starter', 'growth');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "subscription_status" AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'incomplete');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "engine_type" AS ENUM ('perplexity', 'google_ai_overview', 'chatgpt', 'bing_copilot', 'claude');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "query_run_status" AS ENUM ('pending', 'running', 'completed', 'failed', 'partial');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "mention_type" AS ENUM ('direct_citation', 'brand_name', 'indirect_mention', 'not_found');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "sentiment_type" AS ENUM ('positive', 'neutral', 'negative');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "alert_type" AS ENUM ('visibility_drop', 'visibility_increase', 'new_citation', 'lost_citation', 'competitor_change', 'negative_sentiment');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "alert_channel" AS ENUM ('email', 'in_app');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- USERS & ORGANIZATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clerk_id" text NOT NULL UNIQUE,
  "email" text NOT NULL,
  "first_name" text,
  "last_name" text,
  "image_url" text,
  "is_admin" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "created_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "stripe_customer_id" text UNIQUE,
  "stripe_subscription_id" text UNIQUE,
  "subscription_tier" "subscription_tier" NOT NULL DEFAULT 'free',
  "subscription_status" "subscription_status" NOT NULL DEFAULT 'active',
  "trial_ends_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "organization_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" text NOT NULL DEFAULT 'member',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("organization_id", "user_id")
);

-- ============================================
-- PROJECTS
-- ============================================

CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "domain" text NOT NULL,
  "brand_name" text NOT NULL,
  "brand_aliases" text[],
  "google_access_token" text,
  "google_refresh_token" text,
  "google_token_expiry" timestamptz,
  "ga4_property_id" text,
  "gsc_site_url" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- KEYWORDS & MONITORING
-- ============================================

CREATE TABLE IF NOT EXISTS "tracked_keywords" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "keyword" text NOT NULL,
  "category" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("project_id", "keyword")
);
CREATE INDEX IF NOT EXISTS "idx_keywords_project_active" ON "tracked_keywords" ("project_id", "is_active");

CREATE TABLE IF NOT EXISTS "query_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "status" "query_run_status" NOT NULL DEFAULT 'pending',
  "engine_types" "engine_type"[] NOT NULL,
  "total_keywords" integer NOT NULL DEFAULT 0,
  "completed_keywords" integer NOT NULL DEFAULT 0,
  "failed_keywords" integer NOT NULL DEFAULT 0,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_queryruns_project_created" ON "query_runs" ("project_id", "created_at");

CREATE TABLE IF NOT EXISTS "query_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "query_run_id" uuid NOT NULL REFERENCES "query_runs"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "keyword_id" uuid NOT NULL REFERENCES "tracked_keywords"("id") ON DELETE CASCADE,
  "engine_type" "engine_type" NOT NULL,
  "raw_response" text NOT NULL,
  "response_metadata" jsonb,
  "citation_urls" text[],
  "processed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_queryresults_run_engine" ON "query_results" ("query_run_id", "engine_type");
CREATE INDEX IF NOT EXISTS "idx_queryresults_project_keyword" ON "query_results" ("project_id", "keyword_id");

-- ============================================
-- CITATIONS & BRAND MENTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS "citations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "query_result_id" uuid NOT NULL REFERENCES "query_results"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "keyword_id" uuid NOT NULL REFERENCES "tracked_keywords"("id") ON DELETE CASCADE,
  "engine_type" "engine_type" NOT NULL,
  "cited_url" text NOT NULL,
  "cited_domain" text NOT NULL,
  "anchor_text" text,
  "position" integer,
  "is_brand_citation" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_citations_project_brand" ON "citations" ("project_id", "is_brand_citation");
CREATE INDEX IF NOT EXISTS "idx_citations_project_engine" ON "citations" ("project_id", "engine_type");
CREATE INDEX IF NOT EXISTS "idx_citations_project_kw_created" ON "citations" ("project_id", "keyword_id", "created_at");

CREATE TABLE IF NOT EXISTS "brand_mentions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "query_result_id" uuid NOT NULL REFERENCES "query_results"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "keyword_id" uuid NOT NULL REFERENCES "tracked_keywords"("id") ON DELETE CASCADE,
  "engine_type" "engine_type" NOT NULL,
  "mention_type" "mention_type" NOT NULL,
  "matched_text" text NOT NULL,
  "context" text,
  "confidence" real NOT NULL,
  "sentiment" "sentiment_type",
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_mentions_project_type" ON "brand_mentions" ("project_id", "mention_type");
CREATE INDEX IF NOT EXISTS "idx_mentions_project_kw_created" ON "brand_mentions" ("project_id", "keyword_id", "created_at");

-- ============================================
-- COMPETITORS
-- ============================================

CREATE TABLE IF NOT EXISTS "competitors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "domain" text NOT NULL,
  "name" text NOT NULL,
  "aliases" text[],
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("project_id", "domain")
);

CREATE TABLE IF NOT EXISTS "competitor_citations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "query_result_id" uuid NOT NULL REFERENCES "query_results"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "competitor_id" uuid NOT NULL REFERENCES "competitors"("id") ON DELETE CASCADE,
  "keyword_id" uuid NOT NULL REFERENCES "tracked_keywords"("id") ON DELETE CASCADE,
  "engine_type" "engine_type" NOT NULL,
  "cited_url" text NOT NULL,
  "position" integer,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_compcite_project_competitor" ON "competitor_citations" ("project_id", "competitor_id");

-- ============================================
-- ANALYTICS DATA (GA4 + GSC)
-- ============================================

CREATE TABLE IF NOT EXISTS "ga4_traffic_data" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "source" text NOT NULL,
  "medium" text NOT NULL,
  "landing_page" text,
  "sessions" integer NOT NULL DEFAULT 0,
  "users" integer NOT NULL DEFAULT 0,
  "engaged_sessions" integer NOT NULL DEFAULT 0,
  "conversions" integer NOT NULL DEFAULT 0,
  "avg_engagement_time" real,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("project_id", "date", "source", "medium", "landing_page")
);
CREATE INDEX IF NOT EXISTS "idx_ga4_project_date" ON "ga4_traffic_data" ("project_id", "date");

CREATE TABLE IF NOT EXISTS "gsc_data" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "query" text NOT NULL,
  "page" text NOT NULL,
  "clicks" integer NOT NULL DEFAULT 0,
  "impressions" integer NOT NULL DEFAULT 0,
  "ctr" real NOT NULL DEFAULT 0,
  "position" real NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("project_id", "date", "query", "page")
);
CREATE INDEX IF NOT EXISTS "idx_gsc_project_date" ON "gsc_data" ("project_id", "date");

-- ============================================
-- ALERTS
-- ============================================

CREATE TABLE IF NOT EXISTS "alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "alert_type" "alert_type" NOT NULL,
  "alert_channel" "alert_channel" NOT NULL DEFAULT 'in_app',
  "threshold" real,
  "is_enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "alert_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "alert_id" uuid NOT NULL REFERENCES "alerts"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "metadata" jsonb,
  "is_read" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_alertevents_project_read" ON "alert_events" ("project_id", "is_read");
