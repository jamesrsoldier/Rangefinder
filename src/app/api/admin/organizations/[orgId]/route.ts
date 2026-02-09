import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAdmin, handleAuthError } from '@/lib/auth/helpers';
import { getDb } from '@/lib/db';
import { organizations } from '@/lib/db/schema';

export async function PATCH(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    await requireAdmin();
    const db = getDb();
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if (body.subscriptionTier) updates.subscriptionTier = body.subscriptionTier;
    if (body.subscriptionStatus) updates.subscriptionStatus = body.subscriptionStatus;
    if (typeof body.name === 'string') updates.name = body.name;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.id, params.orgId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    await requireAdmin();
    const db = getDb();

    const [deleted] = await db
      .delete(organizations)
      .where(eq(organizations.id, params.orgId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
