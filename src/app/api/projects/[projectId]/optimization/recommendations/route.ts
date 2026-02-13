import { NextRequest } from 'next/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { optimizationRecommendations, trackedKeywords, competitors } from '@/lib/db/schema';
import { requireProjectAccess, handleAuthError } from '@/lib/auth/helpers';
import type { RecommendationType, RecommendationStatus, RecommendationPriority, AnalysisSource } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId);
    const db = getDb();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as RecommendationStatus | null;
    const type = searchParams.get('type') as RecommendationType | null;
    const priority = searchParams.get('priority') as RecommendationPriority | null;
    const keywordId = searchParams.get('keywordId');
    const source = searchParams.get('source') as AnalysisSource | null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20), 100);
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [eq(optimizationRecommendations.projectId, projectId)];
    if (status) {
      conditions.push(eq(optimizationRecommendations.status, status));
    } else {
      // Default to active only
      conditions.push(eq(optimizationRecommendations.status, 'active'));
    }
    if (type) conditions.push(eq(optimizationRecommendations.type, type));
    if (priority) conditions.push(eq(optimizationRecommendations.priority, priority));
    if (keywordId) conditions.push(eq(optimizationRecommendations.keywordId, keywordId));
    if (source) conditions.push(eq(optimizationRecommendations.source, source));

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(optimizationRecommendations)
      .where(whereClause);

    const data = await db
      .select({
        id: optimizationRecommendations.id,
        type: optimizationRecommendations.type,
        priority: optimizationRecommendations.priority,
        status: optimizationRecommendations.status,
        source: optimizationRecommendations.source,
        title: optimizationRecommendations.title,
        description: optimizationRecommendations.description,
        actionableSteps: optimizationRecommendations.actionableSteps,
        estimatedImpact: optimizationRecommendations.estimatedImpact,
        keywordId: optimizationRecommendations.keywordId,
        keyword: trackedKeywords.keyword,
        competitorName: competitors.name,
        targetUrl: optimizationRecommendations.targetUrl,
        createdAt: optimizationRecommendations.createdAt,
      })
      .from(optimizationRecommendations)
      .leftJoin(trackedKeywords, eq(trackedKeywords.id, optimizationRecommendations.keywordId))
      .leftJoin(competitors, eq(competitors.id, optimizationRecommendations.competitorId))
      .where(whereClause)
      .orderBy(desc(optimizationRecommendations.estimatedImpact))
      .limit(limit)
      .offset(offset);

    return Response.json({
      data: data.map(r => ({
        ...r,
        keyword: r.keyword ?? null,
        competitorName: r.competitorName ?? null,
        actionableSteps: (r.actionableSteps as string[]) || [],
        estimatedImpact: r.estimatedImpact ?? 0,
        createdAt: r.createdAt.toISOString(),
      })),
      total: countResult?.count ?? 0,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
