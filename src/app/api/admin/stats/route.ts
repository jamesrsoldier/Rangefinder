import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { requireAdmin, handleAuthError } from '@/lib/auth/helpers';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();

    const [userCount] = await db.execute(sql`SELECT count(*)::int as count FROM users`);
    const [orgCount] = await db.execute(sql`SELECT count(*)::int as count FROM organizations`);
    const [projectCount] = await db.execute(sql`SELECT count(*)::int as count FROM projects`);
    const [keywordCount] = await db.execute(sql`SELECT count(*)::int as count FROM tracked_keywords WHERE is_active = true`);
    const [queryRunCount] = await db.execute(sql`SELECT count(*)::int as count FROM query_runs`);
    const [citationCount] = await db.execute(sql`SELECT count(*)::int as count FROM citations`);

    // Tier distribution
    const tierRows = await db.execute(sql`
      SELECT subscription_tier as tier, count(*)::int as count
      FROM organizations
      GROUP BY subscription_tier
      ORDER BY count DESC
    `);

    // Recent signups (last 7 days)
    const [recentSignups] = await db.execute(sql`
      SELECT count(*)::int as count
      FROM users
      WHERE created_at >= now() - interval '7 days'
    `);

    // Recent query runs (last 7 days)
    const [recentRuns] = await db.execute(sql`
      SELECT count(*)::int as count
      FROM query_runs
      WHERE created_at >= now() - interval '7 days'
    `);

    type CountRow = { count: number };
    type TierRow = { tier: string; count: number };

    return NextResponse.json({
      users: (userCount as unknown as CountRow).count,
      organizations: (orgCount as unknown as CountRow).count,
      projects: (projectCount as unknown as CountRow).count,
      activeKeywords: (keywordCount as unknown as CountRow).count,
      queryRuns: (queryRunCount as unknown as CountRow).count,
      totalCitations: (citationCount as unknown as CountRow).count,
      recentSignups: (recentSignups as unknown as CountRow).count,
      recentQueryRuns: (recentRuns as unknown as CountRow).count,
      tierDistribution: (tierRows as unknown as TierRow[]).map((r) => ({
        tier: r.tier,
        count: r.count,
      })),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
