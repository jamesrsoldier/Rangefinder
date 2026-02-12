import { NextRequest } from 'next/server';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { citations, trackedKeywords } from '@/lib/db/schema';
import { requireProjectAccess, handleAuthError } from '@/lib/auth/helpers';
import type { EngineType } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId);
    const db = getDb();

    const { searchParams } = new URL(request.url);
    const engineParam = searchParams.get('engine');
    const keyword = searchParams.get('keyword');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [eq(citations.projectId, projectId)];
    if (engineParam && engineParam !== 'all') {
      conditions.push(eq(citations.engineType, engineParam as EngineType));
    }
    if (keyword) {
      conditions.push(eq(citations.keywordId, keyword));
    }
    if (from) {
      conditions.push(gte(citations.createdAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(citations.createdAt, new Date(to + 'T23:59:59.999Z')));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(citations)
      .where(whereClause);

    // Get paginated data with keyword name
    const data = await db
      .select({
        id: citations.id,
        keywordId: citations.keywordId,
        keyword: trackedKeywords.keyword,
        engineType: citations.engineType,
        citedUrl: citations.citedUrl,
        citedDomain: citations.citedDomain,
        position: citations.position,
        prominenceScore: sql<number>`0`, // placeholder - computed from position
        isBrandCitation: citations.isBrandCitation,
        createdAt: citations.createdAt,
      })
      .from(citations)
      .leftJoin(trackedKeywords, eq(trackedKeywords.id, citations.keywordId))
      .where(whereClause)
      .orderBy(desc(citations.createdAt))
      .limit(limit)
      .offset(offset);

    return Response.json({
      data: data.map((c) => ({
        ...c,
        keyword: c.keyword ?? 'Unknown',
        prominenceScore: c.position ? Math.max(0, 1 - (c.position - 1) * 0.1) : 0,
        createdAt: c.createdAt.toISOString(),
      })),
      total: countResult?.count ?? 0,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
