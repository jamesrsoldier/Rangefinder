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

    return NextResponse.json({
      users: (userCount as any).count,
      organizations: (orgCount as any).count,
      projects: (projectCount as any).count,
      activeKeywords: (keywordCount as any).count,
      queryRuns: (queryRunCount as any).count,
      totalCitations: (citationCount as any).count,
      recentSignups: (recentSignups as any).count,
      recentQueryRuns: (recentRuns as any).count,
      tierDistribution: (tierRows as any[]).map((r: any) => ({
        tier: r.tier,
        count: r.count,
      })),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
