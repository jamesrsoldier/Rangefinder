import { NextRequest } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { optimizationRecommendations, trackedKeywords, competitors } from '@/lib/db/schema';
import { requireProjectAccess, handleAuthError } from '@/lib/auth/helpers';
import type { RecommendationPriority } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId);
    const db = getDb();

    const { searchParams } = new URL(request.url);
    const priority = searchParams.get('priority') as RecommendationPriority | null;
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20), 100);

    // Action items = active recommendations sorted by estimated impact
    const conditions = [
      eq(optimizationRecommendations.projectId, projectId),
      eq(optimizationRecommendations.status, 'active'),
    ];
    if (priority) {
      conditions.push(eq(optimizationRecommendations.priority, priority));
    }

    const data = await db
      .select({
        id: optimizationRecommendations.id,
        type: optimizationRecommendations.type,
        priority: optimizationRecommendations.priority,
        title: optimizationRecommendations.title,
        description: optimizationRecommendations.description,
        estimatedImpact: optimizationRecommendations.estimatedImpact,
        keywordId: optimizationRecommendations.keywordId,
        keyword: trackedKeywords.keyword,
        competitorName: competitors.name,
        source: optimizationRecommendations.source,
        createdAt: optimizationRecommendations.createdAt,
      })
      .from(optimizationRecommendations)
      .leftJoin(trackedKeywords, eq(trackedKeywords.id, optimizationRecommendations.keywordId))
      .leftJoin(competitors, eq(competitors.id, optimizationRecommendations.competitorId))
      .where(and(...conditions))
      .orderBy(desc(optimizationRecommendations.estimatedImpact))
      .limit(limit);

    return Response.json(
      data.map(item => ({
        ...item,
        keyword: item.keyword ?? null,
        competitorName: item.competitorName ?? null,
        estimatedImpact: item.estimatedImpact ?? 0,
        createdAt: item.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    return handleAuthError(error);
  }
}
