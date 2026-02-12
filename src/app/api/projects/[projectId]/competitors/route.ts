import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { competitors } from '@/lib/db/schema';
import { requireProjectAccess, handleAuthError } from '@/lib/auth/helpers';

const addCompetitorSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().min(1).max(500),
  aliases: z.array(z.string()).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId);
    const db = getDb();

    const result = await db
      .select({
        id: competitors.id,
        domain: competitors.domain,
        name: competitors.name,
        aliases: competitors.aliases,
        createdAt: competitors.createdAt,
      })
      .from(competitors)
      .where(eq(competitors.projectId, projectId))
      .orderBy(competitors.createdAt);

    return Response.json(
      result.map((c) => ({
        ...c,
        aliases: c.aliases ?? [],
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId);

    const body = await request.json();
    const data = addCompetitorSchema.parse(body);
    const db = getDb();

    const [created] = await db
      .insert(competitors)
      .values({
        projectId,
        name: data.name,
        domain: data.domain,
        aliases: data.aliases ?? null,
      })
      .returning();

    return Response.json(created, { status: 201 });
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
