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
        u.id,
        u.clerk_id as "clerkId",
        u.email,
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.is_admin as "isAdmin",
        u.created_at as "createdAt",
        o.name as "orgName",
        o.subscription_tier as "subscriptionTier",
        om.role as "orgRole"
      FROM users u
      LEFT JOIN organization_members om ON om.user_id = u.id
      LEFT JOIN organizations o ON o.id = om.organization_id
      ORDER BY u.created_at DESC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    return handleAuthError(error);
  }
}
