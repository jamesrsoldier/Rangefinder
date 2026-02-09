import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { requireAdmin, handleAuthError } from '@/lib/auth/helpers';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();

    const rows = await db.execute(sql`
      SELECT
        p.id,
        p.name,
        p.domain,
        p.brand_name as "brandName",
        p.created_at as "createdAt",
        o.name as "orgName",
        o.subscription_tier as "subscriptionTier",
        (SELECT count(*)::int FROM tracked_keywords WHERE project_id = p.id AND is_active = true) as "keywordCount",
        (SELECT count(*)::int FROM query_runs WHERE project_id = p.id) as "queryRunCount",
        (SELECT count(*)::int FROM citations WHERE project_id = p.id) as "citationCount",
        (SELECT max(created_at) FROM query_runs WHERE project_id = p.id) as "lastRunAt"
      FROM projects p
      LEFT JOIN organizations o ON o.id = p.organization_id
      ORDER BY p.created_at DESC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    return handleAuthError(error);
  }
}
