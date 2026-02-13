import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { optimizationRecommendations } from '@/lib/db/schema';
import { requireProjectAccess, handleAuthError } from '@/lib/auth/helpers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; recommendationId: string }> }
) {
  try {
    const { projectId, recommendationId } = await params;
    await requireProjectAccess(projectId);
    const db = getDb();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const status = typeof body.status === 'string' ? body.status : '';

    if (!status || !['dismissed', 'completed'].includes(status)) {
      return Response.json(
        { error: 'Invalid status. Must be "dismissed" or "completed".' },
        { status: 400 },
      );
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: now,
    };

    if (status === 'dismissed') {
      updateData.dismissedAt = now;
    } else if (status === 'completed') {
      updateData.completedAt = now;
    }

    const [updated] = await db
      .update(optimizationRecommendations)
      .set(updateData)
      .where(
        and(
          eq(optimizationRecommendations.id, recommendationId),
          eq(optimizationRecommendations.projectId, projectId),
        ),
      )
      .returning({ id: optimizationRecommendations.id });

    if (!updated) {
      return Response.json(
        { error: 'Recommendation not found' },
        { status: 404 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
