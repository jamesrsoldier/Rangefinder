/**
 * Migration SQL for PGlite mock database.
 * This is the same as 0000_shallow_sphinx.sql but embedded as a string
 * so it can be executed without file system access at runtime.
 */
export const MIGRATION_SQL = `
CREATE TYPE "public"."alert_channel" AS ENUM('email', 'in_app');
CREATE TYPE "public"."alert_type" AS ENUM('visibility_drop', 'visibility_increase', 'new_citation', 'lost_citation', 'competitor_change', 'negative_sentiment');
CREATE TYPE "public"."engine_type" AS ENUM('perplexity', 'google_ai_overview', 'chatgpt', 'bing_copilot', 'claude');
CREATE TYPE "public"."mention_type" AS ENUM('direct_citation', 'brand_name', 'indirect_mention', 'not_found');
CREATE TYPE "public"."query_run_status" AS ENUM('pending', 'running', 'completed', 'failed', 'partial');
CREATE TYPE "public"."sentiment_type" AS ENUM('positive', 'neutral', 'negative');
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'canceled', 'trialing', 'incomplete');
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'starter', 'growth');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clerk_id" text NOT NULL,
  "email" text NOT NULL,
  "first_name" text,
  "last_name" text,
  "image_url" text,
  "is_admin" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);

CREATE TABLE "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "subscription_tier" "subscription_tier" DEFAULT 'free' NOT NULL,
  "subscription_status" "subscription_status" DEFAULT 'active' NOT NULL,
  "trial_ends_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
  CONSTRAINT "organizations_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
  CONSTRAINT "organizations_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);

CREATE TABLE "organization_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text DEFAULT 'member' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "organization_members_organization_id_user_id_unique" UNIQUE("organization_id","user_id")
);

CREATE TABLE "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" text NOT NULL,
  "domain" text NOT NULL,
  "brand_name" text NOT NULL,
  "brand_aliases" text[],
  "google_access_token" text,
  "google_refresh_token" text,
  "google_token_expiry" timestamp with time zone,
  "ga4_property_id" text,
  "gsc_site_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "tracked_keywords" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "keyword" text NOT NULL,
  "category" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tracked_keywords_project_id_keyword_unique" UNIQUE("project_id","keyword")
);

CREATE TABLE "query_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "status" "query_run_status" DEFAULT 'pending' NOT NULL,
  "engine_types" "engine_type"[] NOT NULL,
  "total_keywords" integer DEFAULT 0 NOT NULL,
  "completed_keywords" integer DEFAULT 0 NOT NULL,
  "failed_keywords" integer DEFAULT 0 NOT NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "query_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "query_run_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "keyword_id" uuid NOT NULL,
  "engine_type" "engine_type" NOT NULL,
  "raw_response" text NOT NULL,
  "response_metadata" jsonb,
  "citation_urls" text[],
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "citations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "query_result_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "keyword_id" uuid NOT NULL,
  "engine_type" "engine_type" NOT NULL,
  "cited_url" text NOT NULL,
  "cited_domain" text NOT NULL,
  "anchor_text" text,
  "position" integer,
  "is_brand_citation" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "brand_mentions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "query_result_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "keyword_id" uuid NOT NULL,
  "engine_type" "engine_type" NOT NULL,
  "mention_type" "mention_type" NOT NULL,
  "matched_text" text NOT NULL,
  "context" text,
  "confidence" real NOT NULL,
  "sentiment" "sentiment_type",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "competitors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "domain" text NOT NULL,
  "name" text NOT NULL,
  "aliases" text[],
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "competitors_project_id_domain_unique" UNIQUE("project_id","domain")
);

CREATE TABLE "competitor_citations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "query_result_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "competitor_id" uuid NOT NULL,
  "keyword_id" uuid NOT NULL,
  "engine_type" "engine_type" NOT NULL,
  "cited_url" text NOT NULL,
  "position" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "ga4_traffic_data" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "date" date NOT NULL,
  "source" text NOT NULL,
  "medium" text NOT NULL,
  "landing_page" text,
  "sessions" integer DEFAULT 0 NOT NULL,
  "users" integer DEFAULT 0 NOT NULL,
  "engaged_sessions" integer DEFAULT 0 NOT NULL,
  "conversions" integer DEFAULT 0 NOT NULL,
  "avg_engagement_time" real,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ga4_traffic_data_project_id_date_source_medium_landing_page_unique" UNIQUE("project_id","date","source","medium","landing_page")
);

CREATE TABLE "gsc_data" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "date" date NOT NULL,
  "query" text NOT NULL,
  "page" text NOT NULL,
  "clicks" integer DEFAULT 0 NOT NULL,
  "impressions" integer DEFAULT 0 NOT NULL,
  "ctr" real DEFAULT 0 NOT NULL,
  "position" real DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "gsc_data_project_id_date_query_page_unique" UNIQUE("project_id","date","query","page")
);

CREATE TABLE "alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "alert_type" "alert_type" NOT NULL,
  "alert_channel" "alert_channel" DEFAULT 'in_app' NOT NULL,
  "threshold" real,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "alert_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "alert_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "metadata" jsonb,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "tracked_keywords" ADD CONSTRAINT "tracked_keywords_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "query_runs" ADD CONSTRAINT "query_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "query_results" ADD CONSTRAINT "query_results_query_run_id_query_runs_id_fk" FOREIGN KEY ("query_run_id") REFERENCES "public"."query_runs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "query_results" ADD CONSTRAINT "query_results_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "query_results" ADD CONSTRAINT "query_results_keyword_id_tracked_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."tracked_keywords"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "citations" ADD CONSTRAINT "citations_query_result_id_query_results_id_fk" FOREIGN KEY ("query_result_id") REFERENCES "public"."query_results"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "citations" ADD CONSTRAINT "citations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "citations" ADD CONSTRAINT "citations_keyword_id_tracked_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."tracked_keywords"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "brand_mentions" ADD CONSTRAINT "brand_mentions_query_result_id_query_results_id_fk" FOREIGN KEY ("query_result_id") REFERENCES "public"."query_results"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "brand_mentions" ADD CONSTRAINT "brand_mentions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "brand_mentions" ADD CONSTRAINT "brand_mentions_keyword_id_tracked_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."tracked_keywords"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "competitor_citations" ADD CONSTRAINT "competitor_citations_query_result_id_query_results_id_fk" FOREIGN KEY ("query_result_id") REFERENCES "public"."query_results"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "competitor_citations" ADD CONSTRAINT "competitor_citations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "competitor_citations" ADD CONSTRAINT "competitor_citations_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "competitor_citations" ADD CONSTRAINT "competitor_citations_keyword_id_tracked_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."tracked_keywords"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ga4_traffic_data" ADD CONSTRAINT "ga4_traffic_data_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "gsc_data" ADD CONSTRAINT "gsc_data_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
`;
