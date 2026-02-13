import { NextRequest } from 'next/server';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { optimizationScores } from '@/lib/db/schema';
import { requireProjectAccess, handleAuthError } from '@/lib/auth/helpers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId);
    const db = getDb();

    // Get the two most recent project-level scores for trend calculation
    const scores = await db
      .select({
        overallScore: optimizationScores.overallScore,
        contentCoverage: optimizationScores.contentCoverage,
        competitiveGap: optimizationScores.competitiveGap,
        citationConsistency: optimizationScores.citationConsistency,
        freshness: optimizationScores.freshness,
        calculatedAt: optimizationScores.calculatedAt,
      })
      .from(optimizationScores)
      .where(
        and(
          eq(optimizationScores.projectId, projectId),
          isNull(optimizationScores.keywordId), // Project-level score
        ),
      )
      .orderBy(desc(optimizationScores.calculatedAt))
      .limit(2);

    if (scores.length === 0) {
      return Response.json({
        overall: 0,
        contentCoverage: 0,
        competitiveGap: 0,
        citationConsistency: 0,
        freshness: 0,
        trend: 0,
      });
    }

    const current = scores[0];
    const previous = scores.length > 1 ? scores[1] : null;

    const trend = previous
      ? previous.overallScore > 0
        ? Math.round(((current.overallScore - previous.overallScore) / previous.overallScore) * 100 * 10) / 10
        : current.overallScore > 0 ? 100 : 0
      : 0;

    return Response.json({
      overall: current.overallScore,
      contentCoverage: current.contentCoverage,
      competitiveGap: current.competitiveGap,
      citationConsistency: current.citationConsistency,
      freshness: current.freshness,
      trend,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
