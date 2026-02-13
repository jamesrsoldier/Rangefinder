CREATE TYPE "public"."analysis_source" AS ENUM('rule_based', 'ai_powered');--> statement-breakpoint
CREATE TYPE "public"."recommendation_priority" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."recommendation_status" AS ENUM('active', 'dismissed', 'completed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."recommendation_type" AS ENUM('create_content', 'update_content', 'add_schema', 'improve_structure', 'add_comparison', 'improve_authority', 'optimize_citations');--> statement-breakpoint
CREATE TABLE "ai_analysis_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"status" "query_run_status" DEFAULT 'pending' NOT NULL,
	"keywords_analyzed" integer DEFAULT 0 NOT NULL,
	"recommendations_generated" integer DEFAULT 0 NOT NULL,
	"tokens_used" integer,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_gaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"keyword_id" uuid NOT NULL,
	"gap_type" text NOT NULL,
	"competitor_id" uuid,
	"competitor_url" text,
	"brand_last_cited_at" timestamp with time zone,
	"engine_types" "engine_type"[],
	"severity" real DEFAULT 0.5 NOT NULL,
	"source" "analysis_source" DEFAULT 'rule_based' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_gaps_project_id_keyword_id_gap_type_competitor_id_unique" UNIQUE("project_id","keyword_id","gap_type","competitor_id")
);
--> statement-breakpoint
CREATE TABLE "optimization_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"keyword_id" uuid,
	"type" "recommendation_type" NOT NULL,
	"priority" "recommendation_priority" DEFAULT 'medium' NOT NULL,
	"status" "recommendation_status" DEFAULT 'active' NOT NULL,
	"source" "analysis_source" DEFAULT 'rule_based' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"actionable_steps" jsonb,
	"estimated_impact" real,
	"target_url" text,
	"competitor_id" uuid,
	"metadata" jsonb,
	"query_run_id" uuid,
	"dismissed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "optimization_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"keyword_id" uuid,
	"overall_score" real DEFAULT 0 NOT NULL,
	"content_coverage" real DEFAULT 0 NOT NULL,
	"competitive_gap" real DEFAULT 0 NOT NULL,
	"citation_consistency" real DEFAULT 0 NOT NULL,
	"freshness" real DEFAULT 0 NOT NULL,
	"query_run_id" uuid,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_analysis_runs" ADD CONSTRAINT "ai_analysis_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_gaps" ADD CONSTRAINT "content_gaps_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_gaps" ADD CONSTRAINT "content_gaps_keyword_id_tracked_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."tracked_keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_gaps" ADD CONSTRAINT "content_gaps_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_recommendations" ADD CONSTRAINT "optimization_recommendations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_recommendations" ADD CONSTRAINT "optimization_recommendations_keyword_id_tracked_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."tracked_keywords"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_recommendations" ADD CONSTRAINT "optimization_recommendations_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_recommendations" ADD CONSTRAINT "optimization_recommendations_query_run_id_query_runs_id_fk" FOREIGN KEY ("query_run_id") REFERENCES "public"."query_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_scores" ADD CONSTRAINT "optimization_scores_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_scores" ADD CONSTRAINT "optimization_scores_keyword_id_tracked_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."tracked_keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_scores" ADD CONSTRAINT "optimization_scores_query_run_id_query_runs_id_fk" FOREIGN KEY ("query_run_id") REFERENCES "public"."query_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_analysis_project_created" ON "ai_analysis_runs" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_content_gaps_project_type" ON "content_gaps" USING btree ("project_id","gap_type");--> statement-breakpoint
CREATE INDEX "idx_opt_recs_project_status" ON "optimization_recommendations" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "idx_opt_recs_project_priority" ON "optimization_recommendations" USING btree ("project_id","priority");--> statement-breakpoint
CREATE INDEX "idx_opt_recs_project_keyword" ON "optimization_recommendations" USING btree ("project_id","keyword_id");--> statement-breakpoint
CREATE INDEX "idx_opt_scores_project" ON "optimization_scores" USING btree ("project_id");