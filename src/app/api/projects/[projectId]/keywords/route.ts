import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { trackedKeywords, queryResults, citations } from '@/lib/db/schema';
import { requireProjectAccess, handleAuthError } from '@/lib/auth/helpers';

const addKeywordsSchema = z.object({
  keywords: z.array(
    z.object({
      keyword: z.string().min(1).max(500),
      category: z.string().max(100).optional(),
    })
  ).min(1).max(100),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId);
    const db = getDb();

    // Get keywords with latest visibility score
    const kws = await db
      .select({
        id: trackedKeywords.id,
        keyword: trackedKeywords.keyword,
        category: trackedKeywords.category,
        isActive: trackedKeywords.isActive,
        createdAt: trackedKeywords.createdAt,
      })
      .from(trackedKeywords)
      .where(eq(trackedKeywords.projectId, projectId))
      .orderBy(trackedKeywords.createdAt);

    // For each keyword, calculate a simple latest visibility score
    // based on whether it was cited in recent query results
    const result = await Promise.all(
      kws.map(async (kw) => {
        const [citationCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(citations)
          .where(
            and(
              eq(citations.projectId, projectId),
              eq(citations.keywordId, kw.id),
              eq(citations.isBrandCitation, true)
            )
          );

        const [totalResults] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(queryResults)
          .where(
            and(
              eq(queryResults.projectId, projectId),
              eq(queryResults.keywordId, kw.id)
            )
          );

        const total = totalResults?.count ?? 0;
        const cited = citationCount?.count ?? 0;
        const latestVisibilityScore = total > 0 ? Math.round((cited / total) * 100) : null;

        return {
          id: kw.id,
          keyword: kw.keyword,
          category: kw.category,
          isActive: kw.isActive,
          latestVisibilityScore,
          createdAt: kw.createdAt.toISOString(),
        };
      })
    );

    return Response.json(result);
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
    const data = addKeywordsSchema.parse(body);
    const db = getDb();

    const values = data.keywords.map((kw) => ({
      projectId,
      keyword: kw.keyword,
      category: kw.category ?? null,
    }));

    const created = await db
      .insert(trackedKeywords)
      .values(values)
      .onConflictDoNothing()
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
