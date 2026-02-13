import { NextRequest } from 'next/server';
import { eq, and, sql, isNull, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { optimizationRecommendations, contentGaps, optimizationScores } from '@/lib/db/schema';
import { requireProjectAccess, handleAuthError } from '@/lib/auth/helpers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId);
    const db = getDb();

    // Active recommendations count
    const [recsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(optimizationRecommendations)
      .where(
        and(
          eq(optimizationRecommendations.projectId, projectId),
          eq(optimizationRecommendations.status, 'active'),
        ),
      );

    // Critical items count
    const [criticalCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(optimizationRecommendations)
      .where(
        and(
          eq(optimizationRecommendations.projectId, projectId),
          eq(optimizationRecommendations.status, 'active'),
          eq(optimizationRecommendations.priority, 'critical'),
        ),
      );

    // Latest optimization score
    const [latestScore] = await db
      .select({ overallScore: optimizationScores.overallScore })
      .from(optimizationScores)
      .where(
        and(
          eq(optimizationScores.projectId, projectId),
          isNull(optimizationScores.keywordId),
        ),
      )
      .orderBy(desc(optimizationScores.calculatedAt))
      .limit(1);

    // Recommendations by keyword
    const recsByKeyword = await db
      .select({
        keywordId: optimizationRecommendations.keywordId,
        count: sql<number>`count(*)::int`,
      })
      .from(optimizationRecommendations)
      .where(
        and(
          eq(optimizationRecommendations.projectId, projectId),
          eq(optimizationRecommendations.status, 'active'),
        ),
      )
      .groupBy(optimizationRecommendations.keywordId);

    // Content gaps by keyword
    const gapsByKeyword = await db
      .select({
        keywordId: contentGaps.keywordId,
        count: sql<number>`count(*)::int`,
      })
      .from(contentGaps)
      .where(eq(contentGaps.projectId, projectId))
      .groupBy(contentGaps.keywordId);

    // Merge into byKeyword map
    const byKeyword: Record<string, { recommendations: number; hasContentGap: boolean }> = {};

    for (const row of recsByKeyword) {
      if (row.keywordId) {
        byKeyword[row.keywordId] = {
          recommendations: row.count,
          hasContentGap: false,
        };
      }
    }

    for (const row of gapsByKeyword) {
      if (byKeyword[row.keywordId]) {
        byKeyword[row.keywordId].hasContentGap = true;
      } else {
        byKeyword[row.keywordId] = {
          recommendations: 0,
          hasContentGap: true,
        };
      }
    }

    return Response.json({
      activeRecommendations: recsCount?.count ?? 0,
      criticalItems: criticalCount?.count ?? 0,
      optimizationScore: latestScore?.overallScore ?? 0,
      byKeyword,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
