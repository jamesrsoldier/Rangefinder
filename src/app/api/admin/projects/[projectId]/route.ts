import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAdmin, handleAuthError } from '@/lib/auth/helpers';
import { getDb } from '@/lib/db';
import { projects } from '@/lib/db/schema';

export async function DELETE(
  _req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireAdmin();
    const db = getDb();

    const [deleted] = await db
      .delete(projects)
      .where(eq(projects.id, params.projectId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
