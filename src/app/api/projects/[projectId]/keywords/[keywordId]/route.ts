import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { trackedKeywords } from '@/lib/db/schema';
import { requireProjectAccess, handleAuthError } from '@/lib/auth/helpers';

const updateKeywordSchema = z.object({
  isActive: z.boolean().optional(),
  category: z.string().max(100).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; keywordId: string }> }
) {
  try {
    const { projectId, keywordId } = await params;
    await requireProjectAccess(projectId);

    const body = await request.json();
    const data = updateKeywordSchema.parse(body);
    const db = getDb();

    const updates: Record<string, unknown> = {};
    if (data.isActive !== undefined) updates.isActive = data.isActive;
    if (data.category !== undefined) updates.category = data.category;

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    const [updated] = await db
      .update(trackedKeywords)
      .set(updates)
      .where(
        and(
          eq(trackedKeywords.id, keywordId),
          eq(trackedKeywords.projectId, projectId)
        )
      )
      .returning();

    if (!updated) {
      return Response.json({ error: 'Keyword not found' }, { status: 404 });
    }

    return Response.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid request body', details: error.issues },
        { status: 400 }
      );
    }
    return handleAuthError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; keywordId: string }> }
) {
  try {
    const { projectId, keywordId } = await params;
    await requireProjectAccess(projectId);
    const db = getDb();

    const [deleted] = await db
      .delete(trackedKeywords)
      .where(
        and(
          eq(trackedKeywords.id, keywordId),
          eq(trackedKeywords.projectId, projectId)
        )
      )
      .returning();

    if (!deleted) {
      return Response.json({ error: 'Keyword not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
