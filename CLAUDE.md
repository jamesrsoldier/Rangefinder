# Rangefinder - AI Visibility Analytics

## Project Overview
Rangefinder is an AI visibility analytics SaaS platform that tracks how brands are cited across AI answer engines (Perplexity, Google AI Overview, ChatGPT, Bing Copilot, Claude).

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Drizzle ORM (PGlite for mock mode)
- **Auth**: Clerk (mock bypass available)
- **Billing**: Stripe
- **UI**: Tailwind CSS + shadcn/UI (Radix primitives)
- **Data Fetching**: SWR (client), Route Handlers (server)
- **Background Jobs**: Inngest
- **Charts**: Recharts

## Key Commands
```bash
npm run dev      # Start dev server (mock mode by default)
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Start production server
```

## Mock Mode
Set `USE_MOCK_ENGINE=true` and `NEXT_PUBLIC_MOCK_MODE=true` in `.env.local`.
- PGlite replaces PostgreSQL (in-process WebAssembly)
- Mock auth bypasses Clerk (fixed user: `mock_clerk_user_001`)
- Mock engine adapter returns deterministic fake AI responses
- Seed data auto-loads on startup

## Directory Structure
- `src/app/` — Next.js pages and API routes
- `src/app/api/` — REST API route handlers
- `src/app/admin/` — Admin panel pages
- `src/app/dashboard/` — Main dashboard pages
- `src/components/` — React components (admin, dashboard, shared, ui)
- `src/hooks/` — Custom React hooks (SWR-based data fetching)
- `src/lib/db/` — Drizzle ORM schema, migrations, mock seeding
- `src/lib/engines/` — AI engine adapters (mock, perplexity, dataforseo)
- `src/lib/citations/` — Citation extraction, mention detection, scoring
- `src/lib/inngest/` — Background job functions
- `src/lib/billing/` — Stripe integration and plan limits
- `src/lib/analytics/` — GA4 and Search Console integrations
- `src/types/` — Shared TypeScript types

## Conventions
- All API routes use `requireAuth()`, `requireProjectAccess()`, or `requireAdmin()` guards
- Request validation via `zod` schemas
- Client data fetching via SWR hooks with 30s refresh
- UI components follow shadcn/ui patterns (Radix + Tailwind)
- Icons from `lucide-react`
- Path alias: `@/*` maps to `./src/*`

## Database
- 17 tables defined in `src/lib/db/schema/tables.ts`
- 8 PostgreSQL enums in `src/lib/db/schema/enums.ts`
- Relations in `src/lib/db/schema/relations.ts`
- Migrations output to `src/lib/db/migrations/`

## Testing
- Test framework: Vitest
- Test files: `__tests__/` directory at project root
- Run tests: `npm test`
- Run with coverage: `npm run test:coverage`
