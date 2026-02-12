import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { requireAdmin, handleAuthError } from '@/lib/auth/helpers';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();
    const { userId } = await params;
    const db = getDb();
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if (typeof body.isAdmin === 'boolean') updates.isAdmin = body.isAdmin;
    if (typeof body.email === 'string') updates.email = body.email;
    if (typeof body.firstName === 'string') updates.firstName = body.firstName;
    if (typeof body.lastName === 'string') updates.lastName = body.lastName;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      isAdmin: updated.isAdmin,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { userId } = await params;
    const db = getDb();

    // Prevent self-deletion
    if (admin.id === userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Delete org memberships first (cascade), then user
    await db.execute(sql`DELETE FROM organization_members WHERE user_id = ${userId}`);
    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
