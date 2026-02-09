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
        o.id,
        o.name,
        o.slug,
        o.subscription_tier as "subscriptionTier",
        o.subscription_status as "subscriptionStatus",
        o.stripe_customer_id as "stripeCustomerId",
        o.created_at as "createdAt",
        (SELECT count(*)::int FROM organization_members WHERE organization_id = o.id) as "memberCount",
        (SELECT count(*)::int FROM projects WHERE organization_id = o.id) as "projectCount",
        u.email as "ownerEmail",
        u.first_name as "ownerFirstName",
        u.last_name as "ownerLastName"
      FROM organizations o
      LEFT JOIN users u ON u.id = o.created_by_user_id
      ORDER BY o.created_at DESC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    return handleAuthError(error);
  }
}
