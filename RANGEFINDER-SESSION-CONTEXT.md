# Rangefinder - Full Session Context

## What This Document Is

Complete context for continuing development of Rangefinder, an AI Visibility Analytics SaaS. This covers everything built so far, the current state, and the next phase: building the **GEO Optimization Layer** that turns monitoring data into actionable recommendations.

---

## Project Overview

**Rangefinder** tracks how brands are cited across AI answer engines (Perplexity, Google AI Overview, ChatGPT, Bing Copilot, Claude). It monitors keywords, extracts citations, detects brand mentions, benchmarks competitors, and calculates visibility scores.

**The problem**: Right now it's a monitoring dashboard only. It tells users *where they stand* but not *what to do about it*. Users see visibility scores and think "okay... now what?" The optimization layer is what turns this from a dashboard into a tool people would pay for.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.5.12 (App Router) |
| Language | TypeScript (strict mode) |
| React | React 19 |
| Database | PostgreSQL (Supabase) + Drizzle ORM |
| Auth | Clerk v6.37.3 |
| Billing | Stripe (test mode) |
| Background Jobs | Inngest |
| Styling | Tailwind CSS + shadcn/UI |
| Data Fetching | SWR |
| Charts | Recharts |
| AI Engines | Perplexity API, DataForSEO (Google AI Overview) |
| Testing | Vitest (86 tests) |

---

## Working Directory & Repo

- **Local**: `C:\Users\james\Documents\Apps\Rangefinder`
- **GitHub**: https://github.com/jamesrsoldier/Rangefinder
- **Branch**: `claude/explore-geo-app-Ygx0z` pushed to `main` on Rangefinder repo
- **Dev server**: `http://localhost:3001`
- **Inngest dev**: `http://localhost:8288`

---

## Current Project in Production

| Field | Value |
|-------|-------|
| Project Name | AssistIndependence |
| Domain | assistindependence.com |
| Brand Name | AssistIndependence |
| Active Keywords | 10 (aging-in-place / senior safety niche) |
| Subscription Tier | Free |
| Engines Available | Perplexity only (free tier) |

### Active Keywords
1. best grab bars for elderly
2. best shower chairs for seniors
3. best walkers for seniors
4. aging in place products
5. bathroom safety for elderly
6. best rollators 2026
7. best bed rails for elderly
8. toilet safety rails
9. how to install grab bars
10. fall prevention products for seniors

### First Scan Results (completed)
- 10 keywords scanned via Perplexity
- 74 citations extracted
- 10 brand mentions detected
- All dashboard tabs now populated with real data

---

## Architecture Overview

### Monitoring Pipeline (Already Built)

```
User clicks "Run Scan"
    ↓
POST /api/projects/{id}/monitoring
    ↓ Creates queryRun, sends Inngest event
Inngest: keyword-monitor
    ↓ For each keyword × engine: query AI, store queryResult
Inngest: citation-extractor
    ↓ Extract citations, classify brand vs competitor, detect mentions
Inngest: alert-evaluator
    ↓ Compare metrics, generate alert events
Dashboard populates via SWR hooks
```

### Daily Automation
- **6 AM UTC**: `scheduledMonitor` cron fans out monitoring for all active projects
- **8 AM UTC**: `analyticsSync` cron pulls GA4/GSC data for eligible projects

### Plan Tiers

| Feature | Free | Starter | Growth |
|---------|------|---------|--------|
| Keywords | 10 | 100 | 500 |
| Projects | 1 | 2 | 5 |
| Competitors | 1 | 3 | 10 |
| Engines | Perplexity | +AI Overview, ChatGPT | All 5 |
| Runs/keyword | 1 | 3 | 5 |
| GA4 | No | Yes | Yes |
| GSC | No | No | Yes |

---

## File Structure (Key Areas)

```
src/
├── app/
│   ├── api/
│   │   ├── projects/[projectId]/
│   │   │   ├── monitoring/route.ts      ← Manual scan trigger (GET history, POST trigger)
│   │   │   ├── keywords/route.ts        ← GET list, POST add
│   │   │   ├── keywords/[keywordId]/    ← PATCH toggle, DELETE
│   │   │   ├── citations/route.ts       ← GET paginated with filters
│   │   │   ├── citations/stats/         ← GET aggregated stats
│   │   │   ├── competitors/route.ts     ← GET list, POST add
│   │   │   ├── competitors/[id]/        ← DELETE
│   │   │   ├── competitors/benchmark/   ← GET share-of-voice
│   │   │   ├── dashboard/overview/      ← GET overview metrics
│   │   │   ├── dashboard/visibility/    ← GET per-keyword scores
│   │   │   ├── dashboard/traffic/       ← GET GA4 data
│   │   │   ├── alerts/                  ← CRUD alerts + events
│   │   │   └── integrations/google/     ← OAuth, configure, disconnect
│   │   ├── billing/                     ← Stripe checkout/portal
│   │   ├── admin/                       ← Platform admin endpoints
│   │   ├── webhooks/                    ← Clerk + Stripe webhooks
│   │   └── inngest/                     ← Inngest execution endpoint
│   ├── dashboard/                       ← 10 dashboard pages
│   ├── admin/                           ← Admin panel pages
│   └── sign-in/, sign-up/              ← Clerk auth pages
├── components/
│   ├── dashboard/                       ← 22 dashboard components
│   ├── shared/                          ← 5 shared components
│   └── ui/                              ← 14 shadcn/ui primitives
├── hooks/                               ← 4 SWR hooks
├── lib/
│   ├── engines/                         ← AI engine adapters (Perplexity, DataForSEO, Mock)
│   ├── inngest/                         ← 4 background job functions
│   ├── citations/                       ← Extractor, mention detector, scoring
│   ├── billing/                         ← Plan limits, Stripe
│   ├── analytics/                       ← GA4, GSC, Google OAuth
│   ├── auth/                            ← Clerk helpers, auto-provisioning
│   ├── db/                              ← Drizzle schema, migrations
│   └── encryption.ts                    ← AES-256-GCM for OAuth tokens
└── types/index.ts                       ← All TypeScript types & enums
```

---

## Database Schema (17 Tables)

### Core
- **users** — Clerk-synced user profiles (id, clerkId, email, firstName, lastName, isAdmin)
- **organizations** — Billing entities (subscriptionTier, stripeCustomerId, stripeSubscriptionId)
- **organization_members** — User-org membership with role (owner/admin/member)
- **projects** — Tracked domains (name, domain, brandName, brandAliases, Google tokens)

### Monitoring
- **tracked_keywords** — Keywords per project (keyword, category, isActive)
- **query_runs** — Scan executions (status: pending/running/completed/failed/partial, engineTypes[], totalKeywords)
- **query_results** — Individual engine responses (rawResponse, responseMetadata JSONB, citationUrls[])

### Citations & Mentions
- **citations** — Extracted citations (citedUrl, citedDomain, position, isBrandCitation, engineType)
- **brand_mentions** — Brand references in AI text (mentionType, matchedText, context, confidence, sentiment)
- **competitors** — Tracked competitor domains (domain, name, aliases)
- **competitor_citations** — Competitor domain appearances in AI responses

### Alerts
- **alerts** — Alert configurations (alertType, channel, threshold, isEnabled)
- **alert_events** — Triggered alert instances (title, description, metadata JSONB, isRead)

### Analytics
- **ga4_traffic_data** — Google Analytics sessions (source, medium, landingPage, sessions, users, conversions)
- **gsc_data** — Search Console (query, page, clicks, impressions, ctr, position)

---

## Engine Adapters

| Engine | Adapter | Status | API |
|--------|---------|--------|-----|
| Perplexity | PerplexityAdapter | Implemented | api.perplexity.ai (sonar model, return_citations=true) |
| Google AI Overview | DataForSeoAdapter | Implemented | DataForSEO SERP API (extracts ai_overview item) |
| ChatGPT | — | Not implemented | Would need OpenAI API or scraping |
| Bing Copilot | — | Not implemented | Would need Bing API |
| Claude | — | Not implemented | Would need Anthropic API |
| Mock | MockAdapter | Implemented | Deterministic fake responses for testing |

**Mock mode**: Set `USE_MOCK_ENGINE=true` to use MockAdapter for all engines (generates realistic fake citations from sample domains like techcrunch.com, g2.com, forbes.com).

---

## Citation Processing Pipeline

### 1. Extraction (`src/lib/citations/extractor.ts`)
- `extractCitations()` — Pulls URLs from structured citation arrays and raw text regex
- `classifyCitations()` — Labels each citation as brand or competitor based on domain matching
- `normalizeUrl()` — Strips protocol, www, trailing slashes for comparison

### 2. Brand Mention Detection (`src/lib/citations/mention-detector.ts`)
Four-stage pipeline:
1. **direct_citation** — Brand domain appears in citation URLs
2. **brand_name** — Exact brand name match in response text
3. **indirect_mention** — Domain mentioned in text
4. **fuzzy match** — Levenshtein distance ≤ 2 from brand name

### 3. Scoring (`src/lib/citations/scoring.ts`)
- `calculateVisibilityScore()` — Engine-weighted visibility (Perplexity 25%, Google 30%, ChatGPT 25%, Bing 10%, Claude 10%)
- `calculateCitationConfidence()` — Consistency across multiple runs
- `calculateProminenceScore()` — Position-based (1st citation = 1.0, decays by 0.1)
- `calculateShareOfVoice()` — Brand citations / total citations
- `calculateTrend()` — Percentage change between periods

---

## Key Technical Decisions & Fixes Applied

### Next.js 15 Migration
- Upgraded from 14.2 → 15.5.12 to fix Clerk v6 compatibility
- All route handler `params` are `Promise<{}>` and must be `await`ed
- `experimental.serverComponentsExternalPackages` → `serverExternalPackages`
- `experimental.instrumentationHook` removed (built-in in v15)

### Clerk v6 Integration
- All `require("@clerk/nextjs")` dynamic imports converted to static `import` statements
- This was required for Clerk's server actions (detectKeylessEnvDriftAction) to register properly
- Affects: layout.tsx, middleware.ts, sign-in, sign-up, topbar.tsx

### Auto-Provisioning
- `getAuthUser()` in `src/lib/auth/helpers.ts` creates DB user + org on first Clerk sign-in
- Prevents "Unauthorized" errors before Clerk webhook fires

### SWR Error Handling
- Fetcher throws on non-200 responses (prevents error objects from being treated as data)
- Defensive `Array.isArray()` checks in topbar for alerts/projects

### Inngest Local Development
- `INNGEST_DEV=1` must be set in `.env.local` for local dev
- Without it, events are sent to Inngest Cloud instead of local dev server
- Run `npx inngest-cli@latest dev` in separate terminal

---

## What's Built (Complete)

- [x] Full authentication (Clerk) with auto-provisioning
- [x] Multi-tenant organization model with role-based access
- [x] Project CRUD with brand aliases
- [x] Keyword management (add/pause/delete)
- [x] Perplexity engine adapter (live API queries)
- [x] Google AI Overview adapter (DataForSEO)
- [x] Mock engine adapter (for testing without API costs)
- [x] Manual scan trigger (Run Scan button + API)
- [x] Automated daily monitoring (Inngest cron)
- [x] Citation extraction and classification pipeline
- [x] Brand mention detection (4-stage with fuzzy matching)
- [x] Visibility scoring (engine-weighted)
- [x] Share-of-voice calculation
- [x] Competitor tracking and benchmarking
- [x] Alert system (6 alert types, in-app events)
- [x] Dashboard: Overview, Visibility, Citations, Keywords, Competitors, Traffic
- [x] GA4 integration (OAuth + data sync)
- [x] GSC integration (OAuth + data sync)
- [x] Stripe billing (checkout, portal, webhook, tier enforcement)
- [x] Admin panel (users, orgs, projects management)
- [x] Test suite (86 Vitest tests)
- [x] Deployment configs (Dockerfile, vercel.json, .env.example)
- [x] Production Supabase migration (15 tables live)

---

## What's NOT Built (The Optimization Layer)

This is the critical missing piece. The app monitors but doesn't help users improve.

### 1. GEO Recommendations Engine
After each scan, analyze WHY certain keywords get cited and others don't:
- Compare cited vs non-cited keyword characteristics
- Analyze what competitor pages have that yours don't
- Generate specific, actionable recommendations per keyword

### 2. Content Optimization Suggestions
Per-page analysis of AI-friendliness:
- Does the page have structured data / schema markup?
- Is there FAQ content that AI engines can extract?
- Are there statistics, data points, comparison tables?
- Is the content formatted in a way AI engines prefer (listicles, definitive answers)?

### 3. Content Gap Analysis
Compare what AI engines cite vs. what the brand's site offers:
- Keywords with zero brand citations → "Create content targeting X"
- Competitor cited but you're not → "Competitor Y has [content type], you don't"
- Pages that used to be cited but aren't anymore → "Content may be stale"

### 4. Citation Optimization Score
Per-page scoring on how "citation-worthy" content is:
- E-E-A-T signals (expertise, experience, authoritativeness, trustworthiness)
- Structured data presence
- Content freshness
- Answer directness (does the page directly answer the query?)

### 5. Prioritized Action Items
A task list ranked by expected impact:
- "Add FAQ schema to /pricing → estimated +15% visibility for 'best X' keywords"
- "Update statistics on /comparison → data is 18 months old"
- "Create comparison table for 'X vs Y' keywords → competitor Z has one and is cited 3x more"

### 6. Trend Insights & Reporting
- "Your visibility dropped 12% this week — here's what changed"
- "Competitor X started getting cited for 3 new keywords"
- Weekly/monthly email digest with actionable insights

---

## Environment Variables Required

```env
# Core
NEXT_PUBLIC_APP_URL=http://localhost:3001
DATABASE_URL=postgresql://...  (Supabase pooled connection)
DIRECT_URL=postgresql://...    (Supabase direct connection)

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Billing (Stripe test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# AI Engines
PERPLEXITY_API_KEY=pplx-...
DATAFORSEO_LOGIN=...
DATAFORSEO_PASSWORD=...

# Google Integrations (OAuth)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Background Jobs (Inngest)
INNGEST_DEV=1                  ← Required for local development
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=signkey-...

# Encryption
ENCRYPTION_KEY=...             ← 64-char hex for AES-256-GCM

# Mock Mode (set both false for production)
USE_MOCK_ENGINE=false
NEXT_PUBLIC_MOCK_MODE=false
```

---

## How to Run Locally

```bash
# Terminal 1: Next.js dev server
cd C:\Users\james\Documents\Apps\Rangefinder
npm run dev

# Terminal 2: Inngest dev server (required for background jobs)
npx inngest-cli@latest dev

# Terminal 3 (optional): Run tests
npm test
```

- App: http://localhost:3001
- Inngest Dashboard: http://localhost:8288
- Supabase Dashboard: https://supabase.com/dashboard/project/cbmnncalhibpotpykake

---

## Git Workflow

```bash
# Current remotes
origin    → https://github.com/jamesrsoldier/GEO-APP.git (original)
rangefinder → https://github.com/jamesrsoldier/Rangefinder.git (production)

# Push to production
git push rangefinder HEAD:main
```

---

## Critical Implementation Notes

1. **All route handlers use async params** (Next.js 15): `params: Promise<{ projectId: string }>` with `const { projectId } = await params`

2. **Clerk imports must be static**: Never use `require("@clerk/nextjs")` — always `import { X } from "@clerk/nextjs"`. Dynamic imports break server action registration.

3. **SWR fetcher must throw on error**: Return `fetch(url).then(r => { if (!r.ok) throw new Error(...); return r.json(); })` — otherwise error objects become `data`.

4. **Lazy initialization for Stripe/Resend**: Use `process.env.KEY ? new Client(key) : null` pattern to avoid build failures when env vars aren't set.

5. **Drizzle schema exports**: All tables export from `@/lib/db/schema`. Use `getDb()` from `@/lib/db` for the database client.

6. **Auth guards**: Use `requireAuth()` for any authenticated endpoint, `requireProjectAccess(projectId)` for project-scoped endpoints, `requireAdmin()` for admin endpoints.

7. **Inngest events**: Send via `inngest.send({ name: 'event/name', data: {...} })`. Events are defined in `src/lib/inngest/client.ts`.

8. **Plan limits enforcement**: Use functions from `src/lib/billing/plan-limits.ts` (canAddKeywords, canUseEngine, etc.) — they check the org's subscription tier.
