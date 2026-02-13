import { NextRequest } from 'next/server';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { citations, trackedKeywords } from '@/lib/db/schema';
import { requireProjectAccess, handleAuthError } from '@/lib/auth/helpers';
import { endOfDateRange } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId);
    const db = getDb();

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const conditions = [eq(citations.projectId, projectId)];
    if (from) {
      conditions.push(gte(citations.createdAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(citations.createdAt, endOfDateRange(to)));
    }
    const whereClause = and(...conditions);

    // Total citations
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(citations)
      .where(whereClause);

    // By engine
    const byEngine = await db
      .select({
        engine: citations.engineType,
        count: sql<number>`count(*)::int`,
      })
      .from(citations)
      .where(whereClause)
      .groupBy(citations.engineType);

    // By keyword (top 10)
    const byKeyword = await db
      .select({
        keyword: trackedKeywords.keyword,
        count: sql<number>`count(*)::int`,
      })
      .from(citations)
      .leftJoin(trackedKeywords, eq(trackedKeywords.id, citations.keywordId))
      .where(whereClause)
      .groupBy(trackedKeywords.keyword)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    // Over time (by date)
    const overTime = await db
      .select({
        date: sql<string>`date(${citations.createdAt})`,
        total: sql<number>`count(*)::int`,
        brand: sql<number>`count(*) filter (where ${citations.isBrandCitation})::int`,
      })
      .from(citations)
      .where(whereClause)
      .groupBy(sql`date(${citations.createdAt})`)
      .orderBy(sql`date(${citations.createdAt})`);

    return Response.json({
      totalCitations: totalResult?.count ?? 0,
      byEngine: byEngine.map((e) => ({ engine: e.engine, count: e.count })),
      byKeyword: byKeyword.map((k) => ({ keyword: k.keyword ?? 'Unknown', count: k.count })),
      overTime: overTime.map((d) => ({ date: d.date, total: d.total, brand: d.brand })),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
