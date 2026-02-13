import { NextRequest } from 'next/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { contentGaps, trackedKeywords, competitors } from '@/lib/db/schema';
import { requireProjectAccess, handleAuthError } from '@/lib/auth/helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId);
    const db = getDb();

    const { searchParams } = new URL(request.url);
    const gapType = searchParams.get('gapType');
    const keywordId = searchParams.get('keywordId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50), 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(contentGaps.projectId, projectId)];
    if (gapType) conditions.push(eq(contentGaps.gapType, gapType));
    if (keywordId) conditions.push(eq(contentGaps.keywordId, keywordId));

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contentGaps)
      .where(whereClause);

    const data = await db
      .select({
        id: contentGaps.id,
        keywordId: contentGaps.keywordId,
        keyword: trackedKeywords.keyword,
        gapType: contentGaps.gapType,
        competitorName: competitors.name,
        competitorUrl: contentGaps.competitorUrl,
        engineTypes: contentGaps.engineTypes,
        severity: contentGaps.severity,
        source: contentGaps.source,
        createdAt: contentGaps.createdAt,
      })
      .from(contentGaps)
      .leftJoin(trackedKeywords, eq(trackedKeywords.id, contentGaps.keywordId))
      .leftJoin(competitors, eq(competitors.id, contentGaps.competitorId))
      .where(whereClause)
      .orderBy(desc(contentGaps.severity))
      .limit(limit)
      .offset(offset);

    // Summary by gap type
    const summary = await db
      .select({
        gapType: contentGaps.gapType,
        count: sql<number>`count(*)::int`,
      })
      .from(contentGaps)
      .where(eq(contentGaps.projectId, projectId))
      .groupBy(contentGaps.gapType);

    const byType: Record<string, number> = {};
    for (const row of summary) {
      byType[row.gapType] = row.count;
    }

    return Response.json({
      data: data.map(g => ({
        ...g,
        keyword: g.keyword ?? 'Unknown',
        competitorName: g.competitorName ?? null,
        engineTypes: g.engineTypes ?? [],
        createdAt: g.createdAt.toISOString(),
      })),
      total: countResult?.count ?? 0,
      summary: { byType },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
