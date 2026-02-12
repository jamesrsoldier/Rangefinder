import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { competitors } from '@/lib/db/schema';
import { requireProjectAccess, handleAuthError } from '@/lib/auth/helpers';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; competitorId: string }> }
) {
  try {
    const { projectId, competitorId } = await params;
    await requireProjectAccess(projectId);
    const db = getDb();

    const [deleted] = await db
      .delete(competitors)
      .where(
        and(
          eq(competitors.id, competitorId),
          eq(competitors.projectId, projectId)
        )
      )
      .returning();

    if (!deleted) {
      return Response.json({ error: 'Competitor not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
