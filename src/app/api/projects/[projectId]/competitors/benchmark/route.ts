import { NextRequest } from 'next/server';
import { eq, and, gte, lte, sql, type SQL } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  competitors,
  competitorCitations,
  citations,
  trackedKeywords,
} from '@/lib/db/schema';
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

    // Get all competitors for this project
    const projectCompetitors = await db
      .select()
      .from(competitors)
      .where(eq(competitors.projectId, projectId));

    if (projectCompetitors.length === 0) {
      return Response.json([]);
    }

    // Date conditions for competitor citations
    const dateConditions: SQL[] = [];
    if (from) {
      dateConditions.push(gte(competitorCitations.createdAt, new Date(from)));
    }
    if (to) {
      dateConditions.push(lte(competitorCitations.createdAt, endOfDateRange(to)));
    }

    // Get brand citation count for share-of-voice calculation
    const brandDateConditions = [eq(citations.projectId, projectId)];
    if (from) {
      brandDateConditions.push(gte(citations.createdAt, new Date(from)));
    }
    if (to) {
      brandDateConditions.push(lte(citations.createdAt, endOfDateRange(to)));
    }

    const [brandCitationResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(citations)
      .where(and(...brandDateConditions, eq(citations.isBrandCitation, true)));

    const brandCitationCount = brandCitationResult?.count ?? 0;

    // Get top tracked keywords for head-to-head
    const topKeywords = await db
      .select({ id: trackedKeywords.id, keyword: trackedKeywords.keyword })
      .from(trackedKeywords)
      .where(and(eq(trackedKeywords.projectId, projectId), eq(trackedKeywords.isActive, true)))
      .limit(10);

    // Build benchmark data per competitor
    const benchmarks = await Promise.all(
      projectCompetitors.map(async (comp) => {
        const compConditions = [
          eq(competitorCitations.projectId, projectId),
          eq(competitorCitations.competitorId, comp.id),
          ...dateConditions,
        ];

        // Competitor citation count
        const [compCitationResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(competitorCitations)
          .where(and(...compConditions));

        const compCitationCount = compCitationResult?.count ?? 0;

        // Calculate share of voice
        const totalCitations = brandCitationCount + compCitationCount;
        const shareOfVoice = totalCitations > 0
          ? Math.round((compCitationCount / totalCitations) * 100)
          : 0;

        // Simple visibility score (% of keywords where competitor was cited)
        const keywordsCited = await Promise.all(
          topKeywords.map(async (kw) => {
            const [cited] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(competitorCitations)
              .where(
                and(
                  eq(competitorCitations.projectId, projectId),
                  eq(competitorCitations.competitorId, comp.id),
                  eq(competitorCitations.keywordId, kw.id),
                  ...dateConditions
                )
              );
            return {
              keyword: kw.keyword,
              cited: (cited?.count ?? 0) > 0,
            };
          })
        );

        const citedCount = keywordsCited.filter((k) => k.cited).length;
        const visibilityScore = topKeywords.length > 0
          ? Math.round((citedCount / topKeywords.length) * 100)
          : 0;

        return {
          competitorId: comp.id,
          competitorName: comp.name,
          competitorDomain: comp.domain,
          visibilityScore,
          citationCount: compCitationCount,
          shareOfVoice,
          topKeywords: keywordsCited,
        };
      })
    );

    return Response.json(benchmarks);
  } catch (error) {
    return handleAuthError(error);
  }
}
