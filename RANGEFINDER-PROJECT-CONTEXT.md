# Rangefinder — Project Context & Progress

> **Purpose**: This document provides all context needed to continue development of the Rangefinder application in a new Claude Code session. Copy and paste this as your prompt, or reference it as a file.

---

## Project Overview

**Rangefinder** (formerly "Beacon") is an AI visibility analytics SaaS platform. It tracks how brands are cited and mentioned across AI answer engines (Perplexity, Google AI Overview, ChatGPT, Bing Copilot, Claude). Think of it as "SEO monitoring, but for AI search."

**Tech Stack**: Next.js 14 (App Router) · TypeScript (strict) · Drizzle ORM · PostgreSQL · Tailwind CSS · shadcn/UI (Radix) · Clerk Auth · Stripe Billing · Inngest (background jobs) · SWR (client data fetching) · Recharts (charts)

**Working directory**: `/home/user/GEO-APP`
**Git branch**: `claude/explore-geo-app-Ygx0z`
**Package name**: `rangefinder`

---

## Current State (as of last session)

### What's been completed

1. **Unified codebase** — 7 feature branches merged into one working application
2. **Renamed** from "Beacon" to "Rangefinder" throughout the codebase
3. **Full mock mode** — the app runs locally with zero external dependencies:
   - **PGlite** (in-process PostgreSQL via WebAssembly) replaces Supabase
   - **Mock auth** bypasses Clerk (fixed user: `mock_clerk_user_001`)
   - **Mock engine adapter** generates deterministic fake AI responses
   - Seed data: demo user (admin), demo org (growth tier), project "Soldier Data" (soldierdata.com), 5 keywords, 2 competitors, sample query results, 7 days of GA4 data
4. **Admin panel** — full admin CRUD at `/admin` with:
   - System stats overview (users, orgs, projects, keywords, runs, citations)
   - User management (list, toggle admin, delete)
   - Organization management (list, change tier, delete)
   - Project management (list with stats, delete)
   - `isAdmin` boolean on users table, `requireAdmin()` auth helper
   - Conditional "Admin Panel" link in dashboard sidebar
5. **TypeScript**: Zero compilation errors
6. **Dev server**: Starts successfully with `npm run dev`

### What has NOT been done

- No production deployment
- No real Drizzle migration file for the `is_admin` column (only mock migration SQL updated)
- Mobile sidebar (`mobile-sidebar.tsx`) does not have the admin link
- Admin API endpoints have not been tested via curl
- No test suite exists
- No CLAUDE.md file created yet

---

## Git History

```
58e24e0 feat: add admin panel with user, org, and project management
d3d385a feat: add full mock mode for local development without external services
8d081c7 feat: add mock engine adapter for zero-cost testing
6a9abf3 feat: merge all feature branches into unified Rangefinder MVP
8f7e5b8 rename project from Beacon to Rangefinder
97b9ae1 fix: add 7 missing reverse relations and clean up dependencies
591278b feat: add complete dashboard UI with all pages and components
476ae33 feat: add alerts system, dashboard APIs, and background job orchestration
52ee076 feat: add GA4 & Search Console integration with OAuth flow and daily sync
ff6e8e6 feat: add monitoring engine with AI engine adapters and Inngest scheduling
b40db95 feat: add Clerk authentication and Stripe billing integration
23bf6de feat: add citation extraction and brand mention detection pipeline
a344685 feat: initialize Beacon MVP with database schema, shared types, and core utilities
```

---

## Directory Structure

```
src/
├── app/
│   ├── admin/                          # Admin panel pages
│   │   ├── layout.tsx                  # Admin layout with sidebar
│   │   ├── page.tsx                    # Overview dashboard (stats cards)
│   │   ├── users/page.tsx              # User management table
│   │   ├── organizations/page.tsx      # Org management table
│   │   └── projects/page.tsx           # Project management table
│   ├── api/
│   │   ├── admin/                      # Admin API routes (8 endpoints)
│   │   │   ├── check/route.ts          # GET — is current user admin?
│   │   │   ├── stats/route.ts          # GET — platform-wide statistics
│   │   │   ├── users/route.ts          # GET — list all users
│   │   │   ├── users/[userId]/route.ts # PATCH/DELETE — manage user
│   │   │   ├── organizations/route.ts  # GET — list all orgs
│   │   │   ├── organizations/[orgId]/route.ts  # PATCH/DELETE — manage org
│   │   │   ├── projects/route.ts       # GET — list all projects
│   │   │   └── projects/[projectId]/route.ts   # DELETE — delete project
│   │   ├── auth/google/callback/route.ts       # OAuth callback for GA4/GSC
│   │   ├── billing/                    # Stripe checkout, portal, subscription
│   │   ├── inngest/route.ts            # Inngest function endpoint
│   │   ├── projects/                   # Project CRUD + dashboard data + alerts + integrations
│   │   │   ├── route.ts               # GET/POST — list/create projects
│   │   │   └── [projectId]/
│   │   │       ├── route.ts           # GET/PATCH/DELETE
│   │   │       ├── dashboard/overview/route.ts   # Metrics overview
│   │   │       ├── dashboard/traffic/route.ts    # GA4 traffic data
│   │   │       ├── dashboard/visibility/route.ts # Visibility by keyword
│   │   │       ├── alerts/route.ts    # GET/POST alerts
│   │   │       ├── alerts/[alertId]/route.ts     # PATCH/DELETE alert
│   │   │       ├── alerts/events/route.ts        # GET alert events
│   │   │       ├── alerts/events/[eventId]/route.ts  # GET/PATCH event
│   │   │       └── integrations/google/          # Connect/configure/disconnect/properties
│   │   └── webhooks/
│   │       ├── clerk/route.ts          # Clerk user sync webhook
│   │       └── stripe/route.ts         # Stripe subscription webhook
│   ├── dashboard/                      # Main dashboard pages
│   │   ├── layout.tsx                  # Dashboard shell (sidebar + topbar)
│   │   ├── page.tsx                    # Overview
│   │   ├── visibility/page.tsx         # Visibility by keyword & engine
│   │   ├── citations/page.tsx          # Citation details
│   │   ├── keywords/page.tsx           # Keyword management
│   │   ├── competitors/page.tsx        # Competitor tracking
│   │   ├── traffic/page.tsx            # GA4 traffic analytics
│   │   └── settings/                   # Settings, billing, integrations
│   ├── sign-in/[[...sign-in]]/page.tsx # Auth (Clerk or mock bypass)
│   ├── sign-up/[[...sign-up]]/page.tsx
│   ├── layout.tsx                      # Root layout (conditional ClerkProvider)
│   └── page.tsx                        # Redirects to /dashboard
├── components/
│   ├── admin/admin-sidebar.tsx         # Admin nav (red "A" logo)
│   ├── dashboard/                      # 18 dashboard components
│   │   ├── sidebar.tsx                 # Main nav (includes conditional admin link)
│   │   ├── mobile-sidebar.tsx          # Responsive nav (no admin link yet)
│   │   ├── topbar.tsx                  # Project switcher + user menu
│   │   ├── overview-content.tsx        # Dashboard landing
│   │   ├── overview-cards.tsx          # Metric cards
│   │   ├── visibility-content.tsx      # Visibility table
│   │   ├── visibility-chart.tsx        # Time-series chart
│   │   ├── citations-content.tsx       # Citations table
│   │   ├── keywords-content.tsx        # Keywords CRUD
│   │   ├── competitors-content.tsx     # Competitors view
│   │   ├── traffic-content.tsx         # GA4 analytics
│   │   ├── billing-content.tsx         # Subscription management
│   │   ├── integrations-content.tsx    # GA4/GSC setup
│   │   ├── settings-content.tsx        # Project settings form
│   │   ├── alert-feed.tsx              # Alert notifications
│   │   ├── engine-badge.tsx            # Engine logo badges
│   │   ├── engine-bar-chart.tsx        # Engine comparison chart
│   │   └── top-pages-table.tsx         # Top cited pages
│   ├── shared/                         # Reusable components
│   │   ├── date-range-picker.tsx
│   │   ├── empty-state.tsx
│   │   ├── error-boundary.tsx
│   │   ├── loading-skeleton.tsx
│   │   └── trend-indicator.tsx
│   └── ui/                             # shadcn/ui primitives (15 components)
├── hooks/
│   ├── use-project.ts                  # Project context (localStorage-backed)
│   ├── use-dashboard-data.ts           # Dashboard metrics via SWR
│   ├── use-date-range.ts              # Date range filter state
│   └── use-admin-data.ts             # Admin panel data fetching
├── lib/
│   ├── db/
│   │   ├── index.ts                   # DB connection factory (PGlite or postgres)
│   │   ├── schema/tables.ts           # 17 Drizzle tables
│   │   ├── schema/enums.ts            # 8 PostgreSQL enums
│   │   ├── schema/relations.ts        # Drizzle relation definitions
│   │   ├── schema/index.ts            # Re-exports
│   │   ├── mock-migration-sql.ts      # CREATE TABLE SQL for PGlite
│   │   └── mock-seed.ts              # Demo data seeding
│   ├── auth/helpers.ts                # getAuthUser, requireAuth, requireAdmin, requireProjectAccess
│   ├── engines/
│   │   ├── types.ts                   # EngineAdapter interface, EngineResponse type
│   │   ├── index.ts                   # getAdapter() factory, getAvailableEngines()
│   │   ├── mock.ts                    # MockAdapter (deterministic fake responses)
│   │   ├── perplexity.ts             # Perplexity Sonar API adapter
│   │   └── dataforseo.ts            # DataForSEO adapter (Google AI Overview)
│   ├── citations/
│   │   ├── extractor.ts              # URL extraction + brand/competitor classification
│   │   ├── mention-detector.ts       # Multi-stage brand mention detection
│   │   └── scoring.ts               # Visibility score, citation confidence, SoV, prominence
│   ├── inngest/
│   │   ├── client.ts                 # Inngest client
│   │   ├── index.ts                  # Function registry
│   │   └── functions/                # 5 background functions
│   │       ├── keyword-monitor.ts    # Queries AI engines for keywords
│   │       ├── citation-extractor.ts # Extracts citations from responses
│   │       ├── alert-evaluator.ts    # Evaluates alert conditions
│   │       └── analytics-sync.ts    # Syncs GA4 + GSC data
│   ├── billing/
│   │   ├── plan-limits.ts           # Plan tier limits (free/starter/growth)
│   │   └── stripe.ts               # Stripe integration
│   ├── analytics/
│   │   ├── ga4.ts                   # Google Analytics 4 API
│   │   ├── gsc.ts                   # Google Search Console API
│   │   └── google-auth.ts          # OAuth token management
│   ├── constants.ts                 # App-wide constants
│   ├── encryption.ts               # AES-256-GCM for OAuth tokens
│   └── utils.ts                    # cn() helper (clsx + tailwind-merge)
├── types/index.ts                   # All TypeScript types and interfaces
├── middleware.ts                    # Auth middleware (Clerk or mock bypass)
└── instrumentation.ts              # DB initialization on server start
```

---

## Database Schema (17 tables)

### Users & Organizations
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id (uuid), clerk_id, email, first_name, last_name, image_url, **is_admin**, created_at | Links to Clerk |
| `organizations` | id, name, slug, subscription_tier, subscription_status, stripe_customer_id, stripe_subscription_id | Multi-tenant root |
| `organization_members` | user_id, organization_id, role ('owner'\|'admin'\|'member') | Junction table |

### Projects & Monitoring
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `projects` | id, organization_id, name, domain, brand_name, brand_aliases (text[]), ga4_*/gsc_* tokens | Core entity |
| `tracked_keywords` | id, project_id, keyword, category, is_active | What to monitor |
| `query_runs` | id, project_id, status, engine_types, total_keywords, completed_keywords | Batch job tracking |
| `query_results` | id, query_run_id, keyword_id, engine_type, raw_response, citation_urls, response_metadata | Raw AI responses |

### Citations & Mentions
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `citations` | id, query_result_id, cited_url, cited_domain, position, is_brand_citation | URL citations |
| `brand_mentions` | id, query_result_id, mention_type, matched_text, confidence, sentiment | Text mentions |
| `competitors` | id, project_id, domain, name, aliases (text[]) | Tracked competitors |
| `competitor_citations` | id, query_result_id, competitor_id, cited_url, position | Competitor citations |

### Analytics & Alerts
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `ga4_traffic_data` | id, project_id, date, source, medium, sessions, users, conversions | GA4 data |
| `gsc_data` | id, project_id, date, query, page, clicks, impressions, ctr, position | Search Console data |
| `alerts` | id, project_id, alert_type, channel, threshold, is_active | Alert configs |
| `alert_events` | id, alert_id, title, description, is_read | Alert notifications |

### Enums
- `subscription_tier`: free | starter | growth
- `engine_type`: perplexity | google_ai_overview | chatgpt | bing_copilot | claude
- `query_run_status`: pending | running | completed | failed | partial
- `mention_type`: direct_citation | brand_name | indirect_mention | not_found
- `sentiment_type`: positive | neutral | negative
- `alert_type`: visibility_drop | visibility_increase | new_citation | lost_citation | competitor_change | negative_sentiment
- `alert_channel`: email | in_app

---

## Environment Variables (.env.local)

```bash
# Mock Mode (currently active — app runs with zero external deps)
USE_MOCK_ENGINE=true
NEXT_PUBLIC_MOCK_MODE=true

# App
NEXT_PUBLIC_APP_URL=https://soldierdata.com/geo

# Supabase PostgreSQL (not used in mock mode)
DATABASE_URL=postgresql://postgres.lrqyvtzbhihxicwwbaqu:[YOUR_DB_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.lrqyvtzbhihxicwwbaqu:[YOUR_DB_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Clerk Auth (not used in mock mode)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cGF0aWVudC1zdGFybGluZy0zNi5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_Tu48sX51u9brQANSMBtju51rTpIfqEoemU1Pzdn0bf
CLERK_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Stripe (placeholders)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_STARTER_PRICE_ID=price_starter_placeholder
STRIPE_GROWTH_PRICE_ID=price_growth_placeholder

# AI Engine APIs (not used in mock mode)
PERPLEXITY_API_KEY=pplx-placeholder
DATAFORSEO_LOGIN=placeholder
DATAFORSEO_PASSWORD=placeholder

# Google OAuth — GA4 + GSC (placeholders)
GOOGLE_CLIENT_ID=placeholder
GOOGLE_CLIENT_SECRET=placeholder

# Inngest (placeholders)
INNGEST_EVENT_KEY=placeholder
INNGEST_SIGNING_KEY=placeholder

# Encryption (AES-256-GCM for stored OAuth tokens)
ENCRYPTION_KEY=5a146e0304f78e7d7a5552da07aa8109b2ed2da12f65e3b7f07d31957c615cfb
```

---

## Mock Mode Architecture

Mock mode is activated by `USE_MOCK_ENGINE=true` and `NEXT_PUBLIC_MOCK_MODE=true`.

### Database — PGlite
- `src/lib/db/index.ts`: When mock mode is on, creates an in-process PostgreSQL 16 instance via `@electric-sql/pglite` (WebAssembly). No external DB needed.
- `src/instrumentation.ts`: On server startup, runs `mock-migration-sql.ts` (CREATE TABLE statements) then `mock-seed.ts` (INSERT demo data).
- **PGlite quirk**: Array parameters like `$1::text[]` don't work — a `pgArr()` helper in `mock-seed.ts` formats arrays as PostgreSQL array literals `{item1,item2}`.

### Auth — Mock Clerk
- `src/middleware.ts`: When mock mode is on, the Clerk `clerkMiddleware()` is not called; requests pass through unprotected.
- `src/lib/auth/helpers.ts`: `getAuthUser()` returns a fixed user with `clerk_id = "mock_clerk_user_001"` instead of calling Clerk.
- `src/app/layout.tsx`: `ClerkProvider` wrapper is conditionally skipped.
- `src/app/sign-in/[[...sign-in]]/page.tsx`: Renders a "Continue as Demo User" button that redirects to `/dashboard`.

### Engines — Mock Adapter
- `src/lib/engines/mock.ts`: `MockAdapter` generates deterministic fake AI responses. Uses seeded random (keyword+engine hash) so the same input always produces the same output.
- Returns 3–6 citations from a sample domain list, simulates 50–300ms latency.
- `src/lib/engines/index.ts`: `getAdapter()` returns `MockAdapter` when mock mode is on; `getAvailableEngines()` returns all 5 engine types.

### Seed Data
- User: `demo@rangefinder.dev` (admin, clerk_id: `mock_clerk_user_001`)
- Org: "Demo Organization" (growth tier, active)
- Project: "Soldier Data" (domain: soldierdata.com, brand aliases: ["soldier data", "soldierdata"])
- 5 keywords: "best data analytics tools", "data visualization software", "business intelligence platforms", "data engineering solutions", "ETL tools comparison"
- 2 competitors: Ahrefs (ahrefs.com), SEMrush (semrush.com)
- 1 query run with 10 results (5 keywords × 2 engines)
- 7 days of GA4 traffic data

---

## Key Patterns & Conventions

### API Routes
- All routes use Next.js App Router route handlers (`export async function GET/POST/PATCH/DELETE`)
- Auth: Every route calls `requireAuth()`, `requireProjectAccess(projectId)`, or `requireAdmin()`
- Auth errors throw `AuthError` which is caught and returned as `NextResponse.json({ error }, { status })`
- Request validation uses `zod` schemas
- Database queries use Drizzle ORM query builder or raw SQL via `sql` template tag

### Client Data Fetching
- SWR hooks in `src/hooks/` with `fetcher` functions
- Dashboard data: `use-dashboard-data.ts` (30s refresh)
- Admin data: `use-admin-data.ts` (30s refresh)
- Project context: `use-project.ts` (persists selected project in localStorage)

### Components
- All UI built with shadcn/ui (Radix primitives + Tailwind)
- Dashboard pages are client components (`'use client'`) that compose content components
- Layout components handle auth guards and data loading
- Icons from `lucide-react`

### Background Jobs (Inngest)
- `scheduledMonitor`: Cron 6 AM UTC — creates query runs for active projects
- `keywordMonitor`: Event-driven — queries AI engines for all keywords
- `citationExtractor`: Event-driven — extracts/classifies citations from raw responses
- `alertEvaluator`: Event-driven — checks alert conditions
- `analyticsSync`: Cron hourly — syncs GA4/GSC data

### Plan Limits
```
free:    10 keywords, 1 project,  1 competitor,  [perplexity only]
starter: 100 keywords, 2 projects, 3 competitors, [perplexity, google_ai_overview, chatgpt]
growth:  500 keywords, 5 projects, 10 competitors, [all 5 engines]
```

### Scoring Algorithms (src/lib/citations/scoring.ts)
- **Visibility Score**: Weighted average of engine scores (Google AI Overview = 1.5x)
- **Citation Confidence**: % of query runs containing a brand citation
- **Prominence Score**: Position-based (1st=1.0, 2nd=0.8, 3rd=0.6, 4+=0.4)
- **Share of Voice**: brand_citations / total_citations × 100
- **Trend**: ((current - previous) / previous) × 100

---

## Running the App

```bash
# Install dependencies
npm install

# Start dev server (mock mode is on by default)
npm run dev
# → http://localhost:3000

# The app will:
# 1. Initialize PGlite in-memory database
# 2. Run migrations (CREATE TABLE statements)
# 3. Seed demo data
# 4. Log: "[Rangefinder] Mock database initialized with seed data"
```

### Key URLs (local dev)
- `/` → redirects to `/dashboard`
- `/sign-in` → "Continue as Demo User" button
- `/dashboard` → Main dashboard (overview, visibility, citations, keywords, competitors, traffic, settings)
- `/admin` → Admin panel (stats, users, orgs, projects) — visible only to admin users

---

## Configuration Files

- `next.config.mjs`: `instrumentationHook: true`, `serverComponentsExternalPackages: ['@electric-sql/pglite']`
- `tsconfig.json`: `strict: true`, path alias `@/* → ./src/*`
- `tailwind.config.ts`: shadcn/ui design tokens, HSL CSS variables, dark mode via `class`
- `drizzle.config.ts`: Schema at `./src/lib/db/schema/index.ts`, migrations at `./src/lib/db/migrations`, dialect `postgresql`

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                     │
├──────────────┬──────────────┬────────────────────────────┤
│  Pages/UI    │  API Routes  │  Background Jobs (Inngest)  │
│  (React/SWR) │  (REST)      │  (Event-driven)             │
├──────────────┴──────┬───────┴────────────────────────────┤
│                     │                                     │
│   Auth Layer        │   Business Logic                    │
│   (Clerk/Mock)      │   (Citations, Scoring, Engines)     │
│                     │                                     │
├─────────────────────┴────────────────────────────────────┤
│                  Drizzle ORM                              │
├──────────────────────────────────────────────────────────┤
│        PostgreSQL (Supabase) or PGlite (Mock)            │
└──────────────────────────────────────────────────────────┘

External Services:
├── Clerk (authentication & user management)
├── Stripe (subscription billing)
├── Perplexity API (AI engine queries)
├── DataForSEO API (Google AI Overview data)
├── Google Analytics 4 API (traffic data)
├── Google Search Console API (search performance)
└── Inngest (job orchestration)
```

---

## Core Workflow: Keyword Monitoring Pipeline

```
Cron (6 AM UTC) → scheduledMonitor
  → Creates query_run per active project
  → Emits monitoring/run.triggered event

keywordMonitor (receives event)
  → For each keyword × each engine:
    → Calls engine adapter (mock or real)
    → Stores query_result (raw_response, citation_urls)
  → Updates query_run progress/status
  → Emits monitoring/results.ready event

citationExtractor (receives event)
  → For each query_result:
    → Extracts URLs (structured citations + text parsing)
    → Classifies: brand / competitor / neither
    → Detects brand mentions (4-stage pipeline: direct → exact → domain → fuzzy)
    → Calculates sentiment (keyword-based)
    → Stores citations + brand_mentions rows
  → Emits alerts/evaluate event

alertEvaluator (receives event)
  → Checks alert conditions against thresholds
  → Creates alert_events for triggered alerts
```

---

## Known Issues & Future Work

1. **No test suite** — No unit or integration tests exist
2. **No production migrations** — The `is_admin` column was only added to mock migration SQL, not a real Drizzle migration
3. **Mobile sidebar** — `mobile-sidebar.tsx` doesn't show the admin link (desktop sidebar does)
4. **No CLAUDE.md** — No project-level Claude instructions file
5. **Placeholder API keys** — Stripe, Perplexity, DataForSEO, Google, Inngest all have placeholder values
6. **No deployment config** — No Vercel/Docker configuration files
7. **Clerk webhook secret** — Set to `YOUR_WEBHOOK_SECRET` placeholder
