import { eq, and, desc, sql, lt, ne } from 'drizzle-orm';
import type { AnalysisContext, KeywordAnalysis, PreviousRunKeywordData, AnalysisData } from './types';
import {
  projects,
  trackedKeywords,
  competitors,
  citations,
  competitorCitations,
  brandMentions,
  queryRuns,
  queryResults,
} from '@/lib/db/schema';
import type { EngineType } from '@/types';

/**
 * Loads all the data needed for optimization analysis from a completed scan run.
 */
export async function loadAnalysisData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  projectId: string,
  queryRunId: string,
): Promise<AnalysisData> {
  // 1. Load active keywords for this project
  const keywords = await db
    .select({
      id: trackedKeywords.id,
      keyword: trackedKeywords.keyword,
      category: trackedKeywords.category,
    })
    .from(trackedKeywords)
    .where(
      and(
        eq(trackedKeywords.projectId, projectId),
        eq(trackedKeywords.isActive, true),
      ),
    );

  // 2. Load competitors
  const projectCompetitors = await db
    .select({
      id: competitors.id,
      domain: competitors.domain,
      name: competitors.name,
    })
    .from(competitors)
    .where(eq(competitors.projectId, projectId));

  // 3. Load brand citations for this run
  const brandCitationRows = await db
    .select({
      keywordId: citations.keywordId,
      engineType: citations.engineType,
      position: citations.position,
      citedUrl: citations.citedUrl,
    })
    .from(citations)
    .innerJoin(queryResults, eq(citations.queryResultId, queryResults.id))
    .where(
      and(
        eq(queryResults.queryRunId, queryRunId),
        eq(citations.projectId, projectId),
        eq(citations.isBrandCitation, true),
      ),
    );

  // 4. Load competitor citations for this run
  const compCitationRows = await db
    .select({
      keywordId: competitorCitations.keywordId,
      competitorId: competitorCitations.competitorId,
      engineType: competitorCitations.engineType,
      citedUrl: competitorCitations.citedUrl,
    })
    .from(competitorCitations)
    .innerJoin(queryResults, eq(competitorCitations.queryResultId, queryResults.id))
    .where(
      and(
        eq(queryResults.queryRunId, queryRunId),
        eq(competitorCitations.projectId, projectId),
      ),
    );

  // 5. Load brand mentions for this run
  const mentionRows = await db
    .select({
      keywordId: brandMentions.keywordId,
      mentionType: brandMentions.mentionType,
      sentiment: brandMentions.sentiment,
    })
    .from(brandMentions)
    .innerJoin(queryResults, eq(brandMentions.queryResultId, queryResults.id))
    .where(
      and(
        eq(queryResults.queryRunId, queryRunId),
        eq(brandMentions.projectId, projectId),
      ),
    );

  // 6. Load previous run data for stale content detection
  const previousRunData = await loadPreviousRunData(db, projectId, queryRunId);

  // Build per-keyword analysis map
  const competitorMap = new Map<string, { id: string; domain: string; name: string }>(
    projectCompetitors.map((c: { id: string; domain: string; name: string }) => [c.id, c]),
  );
  const keywordAnalyses: KeywordAnalysis[] = keywords.map((kw: { id: string; keyword: string; category: string | null }) => {
    const kwBrandCitations = brandCitationRows.filter((r: { keywordId: string }) => r.keywordId === kw.id);
    const kwCompCitations = compCitationRows.filter((r: { keywordId: string }) => r.keywordId === kw.id);
    const kwMentions = mentionRows.filter((r: { keywordId: string }) => r.keywordId === kw.id);

    // Group competitor citations
    const compCitationsByCompetitor = new Map<string, { urls: string[]; count: number }>();
    for (const cc of kwCompCitations) {
      const existing = compCitationsByCompetitor.get(cc.competitorId) || { urls: [], count: 0 };
      existing.urls.push(cc.citedUrl);
      existing.count++;
      compCitationsByCompetitor.set(cc.competitorId, existing);
    }

    const competitorCitationsList = Array.from(compCitationsByCompetitor.entries()).map(
      ([compId, data]) => {
        const comp = competitorMap.get(compId);
        return {
          competitorId: compId,
          competitorName: comp?.name ?? 'Unknown',
          count: data.count,
          urls: data.urls,
        };
      },
    );

    // Get unique engines from query results for this keyword
    const allEngines = new Set<string>();
    for (const bc of kwBrandCitations) allEngines.add(bc.engineType);
    for (const cc of kwCompCitations) allEngines.add(cc.engineType);

    const engineBreakdown = Array.from(allEngines).map((engine) => ({
      engine: engine as EngineType,
      hasBrandCitation: kwBrandCitations.some((c: { engineType: string }) => c.engineType === engine),
      brandCitationCount: kwBrandCitations.filter((c: { engineType: string }) => c.engineType === engine).length,
      competitorCitationCount: kwCompCitations.filter((c: { engineType: string }) => c.engineType === engine).length,
    }));

    // Dominant mention type and sentiment
    const dominantMention = kwMentions.length > 0 ? kwMentions[0].mentionType : null;
    const negativeMention = kwMentions.find((m: { sentiment: string | null }) => m.sentiment === 'negative');

    return {
      keywordId: kw.id,
      keyword: kw.keyword,
      category: kw.category,
      hasBrandCitation: kwBrandCitations.length > 0,
      brandCitationCount: kwBrandCitations.length,
      brandCitationPositions: kwBrandCitations.map((c: { position: number | null }) => c.position),
      competitorCitations: competitorCitationsList,
      engines: engineBreakdown,
      mentionType: dominantMention,
      sentiment: negativeMention ? 'negative' : (kwMentions[0]?.sentiment ?? null),
      brandMentionCount: kwMentions.length,
    };
  });

  const keywordsWithBrandCitation = keywordAnalyses.filter(ka => ka.hasBrandCitation).length;
  const keywordsWithCompetitorCitation = keywordAnalyses.filter(
    ka => ka.competitorCitations.length > 0,
  ).length;

  return {
    keywordAnalyses,
    previousRunData,
    totalKeywords: keywords.length,
    keywordsWithBrandCitation,
    keywordsWithCompetitorCitation,
  };
}

/**
 * Loads citation data from the most recent completed run before the current one.
 * Used for stale content detection.
 */
async function loadPreviousRunData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  projectId: string,
  currentQueryRunId: string,
): Promise<PreviousRunKeywordData[]> {
  // Find the previous completed run
  const [currentRun] = await db
    .select({ createdAt: queryRuns.createdAt })
    .from(queryRuns)
    .where(eq(queryRuns.id, currentQueryRunId))
    .limit(1);

  if (!currentRun) return [];

  const [previousRun] = await db
    .select({ id: queryRuns.id })
    .from(queryRuns)
    .where(
      and(
        eq(queryRuns.projectId, projectId),
        eq(queryRuns.status, 'completed'),
        ne(queryRuns.id, currentQueryRunId),
        lt(queryRuns.createdAt, currentRun.createdAt),
      ),
    )
    .orderBy(desc(queryRuns.createdAt))
    .limit(1);

  if (!previousRun) return [];

  // Get brand citations from previous run grouped by keyword
  const prevCitations = await db
    .select({
      keywordId: citations.keywordId,
      citationCount: sql<number>`count(*)::int`,
      lastCitedAt: sql<Date>`max(${citations.createdAt})`,
    })
    .from(citations)
    .innerJoin(queryResults, eq(citations.queryResultId, queryResults.id))
    .where(
      and(
        eq(queryResults.queryRunId, previousRun.id),
        eq(citations.isBrandCitation, true),
      ),
    )
    .groupBy(citations.keywordId);

  return prevCitations.map((row: { keywordId: string; citationCount: number; lastCitedAt: Date | null }) => ({
    keywordId: row.keywordId,
    hasBrandCitation: row.citationCount > 0,
    brandCitationCount: row.citationCount,
    lastCitedAt: row.lastCitedAt,
  }));
}

/**
 * Loads the analysis context (project, keywords, competitors) for a project.
 */
export async function loadAnalysisContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  projectId: string,
  queryRunId: string,
): Promise<AnalysisContext> {
  const [project] = await db
    .select({
      id: projects.id,
      domain: projects.domain,
      brandName: projects.brandName,
      brandAliases: projects.brandAliases,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const keywords = await db
    .select({
      id: trackedKeywords.id,
      keyword: trackedKeywords.keyword,
      category: trackedKeywords.category,
    })
    .from(trackedKeywords)
    .where(
      and(
        eq(trackedKeywords.projectId, projectId),
        eq(trackedKeywords.isActive, true),
      ),
    );

  const projectCompetitors = await db
    .select({
      id: competitors.id,
      domain: competitors.domain,
      name: competitors.name,
    })
    .from(competitors)
    .where(eq(competitors.projectId, projectId));

  return {
    project: {
      ...project,
      brandAliases: project.brandAliases ?? [],
    },
    keywords,
    competitors: projectCompetitors,
    queryRunId,
  };
}
