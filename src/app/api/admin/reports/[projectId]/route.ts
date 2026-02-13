import { NextRequest } from 'next/server';
import { eq, and, gte, lte, desc, sql, isNull } from 'drizzle-orm';
import { requireAdmin, handleAuthError } from '@/lib/auth/helpers';
import { getDb } from '@/lib/db';
import {
  projects,
  organizations,
  trackedKeywords,
  citations,
  queryResults,
  queryRuns,
  competitors,
  competitorCitations,
  ga4TrafficData,
  alerts,
  alertEvents,
  optimizationScores,
  optimizationRecommendations,
  contentGaps,
} from '@/lib/db/schema';
import {
  calculateVisibilityScore,
  calculateShareOfVoice,
  calculateTrend,
  type EngineVisibilityInput,
} from '@/lib/citations/scoring';
import { daysAgo, dateToString, endOfDateRange } from '@/lib/utils';
import type { EngineType } from '@/types';

const ENGINE_LABELS: Record<string, string> = {
  perplexity: 'Perplexity',
  google_ai_overview: 'Google AI Overview',
  chatgpt: 'ChatGPT',
  bing_copilot: 'Bing Copilot',
  claude: 'Claude',
};

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

function trendStr(n: number): string {
  if (n === 0) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${fmt(n)}%`;
}

function escMd(s: string | null | undefined): string {
  return (s ?? '—').replace(/\|/g, '\\|');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await requireAdmin();
    const { projectId } = await params;
    const db = getDb();

    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get('from') || dateToString(daysAgo(30));
    const toDate = searchParams.get('to') || dateToString(new Date());
    const now = new Date().toISOString();

    // Calculate previous period for trends
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const durationMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - durationMs);
    const prevTo = new Date(from.getTime());
    const prevFromStr = dateToString(prevFrom);
    const prevToStr = dateToString(prevTo);

    // ── 1. Project + Org metadata ──────────────────────────────
    const [project] = await db
      .select({
        name: projects.name,
        domain: projects.domain,
        brandName: projects.brandName,
        brandAliases: projects.brandAliases,
        ga4PropertyId: projects.ga4PropertyId,
        gscSiteUrl: projects.gscSiteUrl,
        createdAt: projects.createdAt,
        orgName: organizations.name,
        tier: organizations.subscriptionTier,
        subStatus: organizations.subscriptionStatus,
      })
      .from(projects)
      .leftJoin(organizations, eq(organizations.id, projects.organizationId))
      .where(eq(projects.id, projectId));

    if (!project) {
      return new Response('Project not found', { status: 404 });
    }

    // ── 2. Visibility score ────────────────────────────────────
    const currentEngineData = await getVisibilityDataForPeriod(db, projectId, fromDate, toDate);
    const currentVisibility = calculateVisibilityScore(currentEngineData);
    const prevEngineData = await getVisibilityDataForPeriod(db, projectId, prevFromStr, prevToStr);
    const prevVisibility = calculateVisibilityScore(prevEngineData);
    const visibilityTrend = calculateTrend(currentVisibility.score, prevVisibility.score);

    // ── 3. Citation counts ─────────────────────────────────────
    const [citationCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(citations)
      .where(and(
        eq(citations.projectId, projectId),
        eq(citations.isBrandCitation, true),
        gte(citations.createdAt, new Date(fromDate)),
        lte(citations.createdAt, endOfDateRange(toDate))
      ));

    const [prevCitationCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(citations)
      .where(and(
        eq(citations.projectId, projectId),
        eq(citations.isBrandCitation, true),
        gte(citations.createdAt, prevFrom),
        lte(citations.createdAt, from)
      ));
    const citationsTrend = calculateTrend(citationCount?.count || 0, prevCitationCount?.count || 0);

    // ── 4. AI referral sessions ────────────────────────────────
    const [sessionsResult] = await db
      .select({ total: sql<number>`coalesce(sum(${ga4TrafficData.sessions}), 0)::int` })
      .from(ga4TrafficData)
      .where(and(
        eq(ga4TrafficData.projectId, projectId),
        gte(ga4TrafficData.date, fromDate),
        lte(ga4TrafficData.date, toDate)
      ));

    const [prevSessionsResult] = await db
      .select({ total: sql<number>`coalesce(sum(${ga4TrafficData.sessions}), 0)::int` })
      .from(ga4TrafficData)
      .where(and(
        eq(ga4TrafficData.projectId, projectId),
        gte(ga4TrafficData.date, prevFromStr),
        lte(ga4TrafficData.date, prevToStr)
      ));
    const sessionsTrend = calculateTrend(sessionsResult?.total || 0, prevSessionsResult?.total || 0);

    // ── 5. Share of voice ──────────────────────────────────────
    const [brandCitCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(citations)
      .where(and(
        eq(citations.projectId, projectId),
        eq(citations.isBrandCitation, true),
        gte(citations.createdAt, new Date(fromDate)),
        lte(citations.createdAt, endOfDateRange(toDate))
      ));

    const compCitCounts = await db
      .select({
        competitorId: competitorCitations.competitorId,
        count: sql<number>`count(*)::int`,
      })
      .from(competitorCitations)
      .where(and(
        eq(competitorCitations.projectId, projectId),
        gte(competitorCitations.createdAt, new Date(fromDate)),
        lte(competitorCitations.createdAt, endOfDateRange(toDate))
      ))
      .groupBy(competitorCitations.competitorId);

    const currentSov = calculateShareOfVoice(
      brandCitCount?.count || 0,
      compCitCounts.map(c => ({ competitorId: c.competitorId, count: c.count }))
    );

    // Previous SoV for trend
    const [prevBrandCitCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(citations)
      .where(and(
        eq(citations.projectId, projectId),
        eq(citations.isBrandCitation, true),
        gte(citations.createdAt, prevFrom),
        lte(citations.createdAt, from)
      ));
    const prevCompCitCounts = await db
      .select({
        competitorId: competitorCitations.competitorId,
        count: sql<number>`count(*)::int`,
      })
      .from(competitorCitations)
      .where(and(
        eq(competitorCitations.projectId, projectId),
        gte(competitorCitations.createdAt, prevFrom),
        lte(competitorCitations.createdAt, from)
      ))
      .groupBy(competitorCitations.competitorId);
    const prevSov = calculateShareOfVoice(
      prevBrandCitCount?.count || 0,
      prevCompCitCounts.map(c => ({ competitorId: c.competitorId, count: c.count }))
    );
    const sovTrend = calculateTrend(currentSov.shareOfVoice ?? 0, prevSov.shareOfVoice ?? 0);

    // ── 6. Optimization scores ─────────────────────────────────
    const optScores = await db
      .select({
        overallScore: optimizationScores.overallScore,
        contentCoverage: optimizationScores.contentCoverage,
        competitiveGap: optimizationScores.competitiveGap,
        citationConsistency: optimizationScores.citationConsistency,
        freshness: optimizationScores.freshness,
      })
      .from(optimizationScores)
      .where(and(
        eq(optimizationScores.projectId, projectId),
        isNull(optimizationScores.keywordId)
      ))
      .orderBy(desc(optimizationScores.calculatedAt))
      .limit(1);

    const optScore = optScores[0] ?? {
      overallScore: 0, contentCoverage: 0,
      competitiveGap: 0, citationConsistency: 0, freshness: 0,
    };

    // ── 7. Visibility by engine ────────────────────────────────
    const [totalKwCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(trackedKeywords)
      .where(and(eq(trackedKeywords.projectId, projectId), eq(trackedKeywords.isActive, true)));
    const totalKw = totalKwCount?.count || 0;

    // ── 8. Keywords with per-engine visibility ─────────────────
    const keywordRows = await db
      .select({
        id: trackedKeywords.id,
        keyword: trackedKeywords.keyword,
        category: trackedKeywords.category,
      })
      .from(trackedKeywords)
      .where(and(eq(trackedKeywords.projectId, projectId), eq(trackedKeywords.isActive, true)))
      .orderBy(trackedKeywords.keyword);

    // For each keyword, get engines that cited it
    const kwCitationData = await db
      .select({
        keywordId: citations.keywordId,
        engineType: citations.engineType,
        count: sql<number>`count(*)::int`,
      })
      .from(citations)
      .where(and(
        eq(citations.projectId, projectId),
        eq(citations.isBrandCitation, true),
        gte(citations.createdAt, new Date(fromDate)),
        lte(citations.createdAt, endOfDateRange(toDate))
      ))
      .groupBy(citations.keywordId, citations.engineType);

    const kwCitMap = new Map<string, Map<string, number>>();
    for (const row of kwCitationData) {
      if (!kwCitMap.has(row.keywordId)) kwCitMap.set(row.keywordId, new Map());
      kwCitMap.get(row.keywordId)!.set(row.engineType, row.count);
    }

    // Total distinct engines that queried each keyword
    const kwQueriedEngines = await db
      .select({
        keywordId: queryResults.keywordId,
        engineCount: sql<number>`count(distinct ${queryResults.engineType})::int`,
      })
      .from(queryResults)
      .where(and(
        eq(queryResults.projectId, projectId),
        gte(queryResults.createdAt, new Date(fromDate)),
        lte(queryResults.createdAt, endOfDateRange(toDate))
      ))
      .groupBy(queryResults.keywordId);

    const kwEngineCountMap = new Map(kwQueriedEngines.map(r => [r.keywordId, r.engineCount]));

    // ── 9. Top cited pages ─────────────────────────────────────
    const topPages = await db
      .select({
        url: citations.citedUrl,
        count: sql<number>`count(*)::int`,
        engines: sql<string[]>`array_agg(distinct ${citations.engineType})`,
      })
      .from(citations)
      .where(and(
        eq(citations.projectId, projectId),
        eq(citations.isBrandCitation, true),
        gte(citations.createdAt, new Date(fromDate)),
        lte(citations.createdAt, endOfDateRange(toDate))
      ))
      .groupBy(citations.citedUrl)
      .orderBy(desc(sql`count(*)`))
      .limit(15);

    // ── 10. Competitor benchmarks ──────────────────────────────
    const competitorRows = await db
      .select({
        id: competitors.id,
        name: competitors.name,
        domain: competitors.domain,
      })
      .from(competitors)
      .where(eq(competitors.projectId, projectId));

    const compCitDetails = await db
      .select({
        competitorId: competitorCitations.competitorId,
        count: sql<number>`count(*)::int`,
      })
      .from(competitorCitations)
      .where(and(
        eq(competitorCitations.projectId, projectId),
        gte(competitorCitations.createdAt, new Date(fromDate)),
        lte(competitorCitations.createdAt, endOfDateRange(toDate))
      ))
      .groupBy(competitorCitations.competitorId);

    const compCitMap = new Map(compCitDetails.map(c => [c.competitorId, c.count]));
    const totalAllCitations = (brandCitCount?.count || 0) + compCitDetails.reduce((s, c) => s + c.count, 0);

    // ── 11. Content gaps ───────────────────────────────────────
    const gaps = await db
      .select({
        keyword: trackedKeywords.keyword,
        gapType: contentGaps.gapType,
        severity: contentGaps.severity,
        competitorName: competitors.name,
        engineTypes: contentGaps.engineTypes,
      })
      .from(contentGaps)
      .leftJoin(trackedKeywords, eq(trackedKeywords.id, contentGaps.keywordId))
      .leftJoin(competitors, eq(competitors.id, contentGaps.competitorId))
      .where(eq(contentGaps.projectId, projectId))
      .orderBy(desc(contentGaps.severity))
      .limit(50);

    // ── 12. Active recommendations ─────────────────────────────
    const recs = await db
      .select({
        priority: optimizationRecommendations.priority,
        type: optimizationRecommendations.type,
        title: optimizationRecommendations.title,
        estimatedImpact: optimizationRecommendations.estimatedImpact,
        keyword: trackedKeywords.keyword,
      })
      .from(optimizationRecommendations)
      .leftJoin(trackedKeywords, eq(trackedKeywords.id, optimizationRecommendations.keywordId))
      .where(and(
        eq(optimizationRecommendations.projectId, projectId),
        eq(optimizationRecommendations.status, 'active')
      ))
      .orderBy(
        sql`CASE ${optimizationRecommendations.priority}
          WHEN 'critical' THEN 1 WHEN 'high' THEN 2
          WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END`
      )
      .limit(50);

    // ── 13. Scan history ───────────────────────────────────────
    const scans = await db
      .select({
        status: queryRuns.status,
        engineTypes: queryRuns.engineTypes,
        totalKeywords: queryRuns.totalKeywords,
        completedKeywords: queryRuns.completedKeywords,
        failedKeywords: queryRuns.failedKeywords,
        createdAt: queryRuns.createdAt,
      })
      .from(queryRuns)
      .where(eq(queryRuns.projectId, projectId))
      .orderBy(desc(queryRuns.createdAt))
      .limit(10);

    // ── 14. Alerts ─────────────────────────────────────────────
    const alertRows = await db
      .select({
        alertType: alerts.alertType,
        title: alertEvents.title,
        description: alertEvents.description,
        isRead: alertEvents.isRead,
        createdAt: alertEvents.createdAt,
      })
      .from(alertEvents)
      .innerJoin(alerts, eq(alerts.id, alertEvents.alertId))
      .where(eq(alertEvents.projectId, projectId))
      .orderBy(desc(alertEvents.createdAt))
      .limit(20);

    // ── 15. Traffic data ───────────────────────────────────────
    const ga4Connected = !!project.ga4PropertyId;

    let trafficSummary: {
      totalSessions: number; totalConversions: number; engagementRate: number;
    } | null = null;
    let trafficBySource: { source: string; sessions: number; conversions: number }[] = [];
    let topLandingPages: { page: string; sessions: number; engagementRate: number }[] = [];

    if (ga4Connected) {
      const [tSummary] = await db
        .select({
          totalSessions: sql<number>`coalesce(sum(${ga4TrafficData.sessions}), 0)::int`,
          totalConversions: sql<number>`coalesce(sum(${ga4TrafficData.conversions}), 0)::int`,
          totalEngaged: sql<number>`coalesce(sum(${ga4TrafficData.engagedSessions}), 0)::int`,
        })
        .from(ga4TrafficData)
        .where(and(
          eq(ga4TrafficData.projectId, projectId),
          gte(ga4TrafficData.date, fromDate),
          lte(ga4TrafficData.date, toDate)
        ));

      trafficSummary = {
        totalSessions: tSummary?.totalSessions || 0,
        totalConversions: tSummary?.totalConversions || 0,
        engagementRate: tSummary?.totalSessions
          ? ((tSummary.totalEngaged || 0) / tSummary.totalSessions) * 100
          : 0,
      };

      trafficBySource = await db
        .select({
          source: ga4TrafficData.source,
          sessions: sql<number>`sum(${ga4TrafficData.sessions})::int`,
          conversions: sql<number>`sum(${ga4TrafficData.conversions})::int`,
        })
        .from(ga4TrafficData)
        .where(and(
          eq(ga4TrafficData.projectId, projectId),
          gte(ga4TrafficData.date, fromDate),
          lte(ga4TrafficData.date, toDate)
        ))
        .groupBy(ga4TrafficData.source)
        .orderBy(desc(sql`sum(${ga4TrafficData.sessions})`))
        .limit(10);

      topLandingPages = (await db
        .select({
          page: ga4TrafficData.landingPage,
          sessions: sql<number>`sum(${ga4TrafficData.sessions})::int`,
          engaged: sql<number>`sum(${ga4TrafficData.engagedSessions})::int`,
        })
        .from(ga4TrafficData)
        .where(and(
          eq(ga4TrafficData.projectId, projectId),
          gte(ga4TrafficData.date, fromDate),
          lte(ga4TrafficData.date, toDate),
          sql`${ga4TrafficData.landingPage} IS NOT NULL`
        ))
        .groupBy(ga4TrafficData.landingPage)
        .orderBy(desc(sql`sum(${ga4TrafficData.sessions})`))
        .limit(10))
        .map(p => ({
          page: p.page || '(not set)',
          sessions: p.sessions,
          engagementRate: p.sessions ? (p.engaged / p.sessions) * 100 : 0,
        }));
    }

    // ════════════════════════════════════════════════════════════
    // ASSEMBLE MARKDOWN
    // ════════════════════════════════════════════════════════════

    const lines: string[] = [];
    const ln = (s = '') => lines.push(s);

    ln(`# Rangefinder Project Report: ${project.name}`);
    ln(`Generated: ${now} | Period: ${fromDate} to ${toDate}`);
    ln();

    // ── Section 1: Project Overview ────────────────────────────
    ln(`## 1. Project Overview`);
    ln(`- **Domain:** ${project.domain}`);
    ln(`- **Brand:** ${project.brandName}${project.brandAliases?.length ? ` (aliases: ${project.brandAliases.join(', ')})` : ''}`);
    ln(`- **Organization:** ${project.orgName ?? '—'} | **Tier:** ${project.tier ?? '—'} | **Status:** ${project.subStatus ?? '—'}`);
    ln(`- **Created:** ${project.createdAt.toISOString().split('T')[0]}`);
    ln(`- **GA4 Connected:** ${ga4Connected ? 'Yes' : 'No'} | **GSC Connected:** ${project.gscSiteUrl ? 'Yes' : 'No'}`);
    ln(`- **Active Keywords:** ${totalKw}`);
    ln();

    // ── Section 2: Health Summary ──────────────────────────────
    ln(`## 2. Health Summary`);
    ln(`| Metric | Value | Trend |`);
    ln(`|--------|-------|-------|`);
    ln(`| Visibility Score | ${fmt(currentVisibility.score)}% | ${trendStr(visibilityTrend)} |`);
    ln(`| Total Brand Citations | ${citationCount?.count || 0} | ${trendStr(citationsTrend)} |`);
    ln(`| AI Referral Sessions | ${sessionsResult?.total || 0} | ${trendStr(sessionsTrend)} |`);
    ln(`| Share of Voice | ${fmt(currentSov.shareOfVoice ?? 0)}% | ${trendStr(sovTrend)} |`);
    ln(`| Optimization Score | ${fmt(optScore.overallScore, 0)}/100 | — |`);
    ln();

    // ── Section 3: Optimization Breakdown ──────────────────────
    ln(`## 3. Optimization Breakdown`);
    ln(`| Component | Score |`);
    ln(`|-----------|-------|`);
    ln(`| Content Coverage | ${fmt(optScore.contentCoverage, 0)}/100 |`);
    ln(`| Competitive Gap | ${fmt(optScore.competitiveGap, 0)}/100 |`);
    ln(`| Citation Consistency | ${fmt(optScore.citationConsistency, 0)}/100 |`);
    ln(`| Freshness | ${fmt(optScore.freshness, 0)}/100 |`);
    ln();

    // ── Section 4: Visibility by Engine ────────────────────────
    ln(`## 4. Visibility by Engine`);
    ln(`| Engine | Score | Keywords Cited |`);
    ln(`|--------|-------|----------------|`);
    for (const ed of currentEngineData) {
      const label = ENGINE_LABELS[ed.engine ?? ''] ?? ed.engine ?? 'Unknown';
      const score = ed.totalKeywords > 0 ? (ed.keywordsCited / ed.totalKeywords) * 100 : 0;
      ln(`| ${label} | ${fmt(score)}% | ${ed.keywordsCited}/${ed.totalKeywords} |`);
    }
    if (currentEngineData.length === 0) {
      ln(`| (no engine data) | — | — |`);
    }
    ln();

    // ── Section 5: Tracked Keywords ────────────────────────────
    ln(`## 5. Tracked Keywords (${totalKw} active)`);
    ln(`| Keyword | Category | Visibility | Engines Citing |`);
    ln(`|---------|----------|------------|----------------|`);
    for (const kw of keywordRows) {
      const enginesMap = kwCitMap.get(kw.id);
      const citingEngines = enginesMap ? [...enginesMap.keys()] : [];
      const queriedCount = kwEngineCountMap.get(kw.id) || 0;
      const citedCount = citingEngines.length;
      const vis = queriedCount > 0 ? (citedCount / queriedCount) * 100 : 0;
      const engineNames = citingEngines.map(e => ENGINE_LABELS[e] ?? e).join(', ') || '—';
      ln(`| ${escMd(kw.keyword)} | ${escMd(kw.category)} | ${fmt(vis)}% | ${engineNames} |`);
    }
    ln();

    // ── Section 6: Top Cited Pages ─────────────────────────────
    ln(`## 6. Top Cited Pages`);
    ln(`| URL | Citations | Engines |`);
    ln(`|-----|-----------|---------|`);
    for (const p of topPages) {
      const engineNames = (p.engines || []).map(e => ENGINE_LABELS[e] ?? e).join(', ');
      ln(`| ${escMd(p.url)} | ${p.count} | ${engineNames} |`);
    }
    if (topPages.length === 0) {
      ln(`| (no citations yet) | — | — |`);
    }
    ln();

    // ── Section 7: Competitor Benchmarks ───────────────────────
    ln(`## 7. Competitor Benchmarks`);
    if (competitorRows.length === 0) {
      ln(`No competitors configured.`);
    } else {
      ln(`| Competitor | Domain | Citations | Share of Voice |`);
      ln(`|------------|--------|-----------|----------------|`);
      for (const comp of competitorRows) {
        const cCount = compCitMap.get(comp.id) || 0;
        const sov = totalAllCitations > 0 ? (cCount / totalAllCitations) * 100 : 0;
        ln(`| ${escMd(comp.name)} | ${escMd(comp.domain)} | ${cCount} | ${fmt(sov)}% |`);
      }
      ln(`| **${escMd(project.brandName)} (You)** | **${escMd(project.domain)}** | **${brandCitCount?.count || 0}** | **${fmt(currentSov.shareOfVoice ?? 0)}%** |`);
    }
    ln();

    // ── Section 8: Content Gaps ────────────────────────────────
    ln(`## 8. Content Gaps (${gaps.length} identified)`);
    if (gaps.length === 0) {
      ln(`No content gaps identified.`);
    } else {
      ln(`| Keyword | Gap Type | Severity | Competitor | Engines |`);
      ln(`|---------|----------|----------|------------|---------|`);
      for (const g of gaps) {
        const engines = (g.engineTypes || []).map(e => ENGINE_LABELS[e] ?? e).join(', ') || '—';
        ln(`| ${escMd(g.keyword)} | ${g.gapType} | ${fmt(g.severity, 2)} | ${escMd(g.competitorName)} | ${engines} |`);
      }
    }
    ln();

    // ── Section 9: Active Recommendations ──────────────────────
    ln(`## 9. Active Recommendations (${recs.length})`);
    if (recs.length === 0) {
      ln(`No active recommendations.`);
    } else {
      ln(`| Priority | Type | Title | Est. Impact | Keyword |`);
      ln(`|----------|------|-------|-------------|---------|`);
      for (const r of recs) {
        const impact = r.estimatedImpact != null ? fmt(r.estimatedImpact, 2) : '—';
        ln(`| ${r.priority} | ${r.type} | ${escMd(r.title)} | ${impact} | ${escMd(r.keyword)} |`);
      }
    }
    ln();

    // ── Section 10: Recent Scan History ────────────────────────
    ln(`## 10. Recent Scan History (last ${scans.length})`);
    if (scans.length === 0) {
      ln(`No scans run yet.`);
    } else {
      ln(`| Date | Status | Engines | Keywords | Completed | Failed |`);
      ln(`|------|--------|---------|----------|-----------|--------|`);
      for (const s of scans) {
        const date = s.createdAt.toISOString().split('T')[0];
        const engineCount = s.engineTypes?.length ?? 0;
        ln(`| ${date} | ${s.status} | ${engineCount} | ${s.totalKeywords} | ${s.completedKeywords} | ${s.failedKeywords} |`);
      }
    }
    ln();

    // ── Section 11: Recent Alerts ──────────────────────────────
    ln(`## 11. Recent Alerts (last ${alertRows.length})`);
    if (alertRows.length === 0) {
      ln(`No alert events.`);
    } else {
      ln(`| Date | Type | Title | Description | Read |`);
      ln(`|------|------|-------|-------------|------|`);
      for (const a of alertRows) {
        const date = a.createdAt.toISOString().split('T')[0];
        ln(`| ${date} | ${a.alertType} | ${escMd(a.title)} | ${escMd(a.description)} | ${a.isRead ? 'Yes' : 'No'} |`);
      }
    }
    ln();

    // ── Section 12: AI Traffic ─────────────────────────────────
    ln(`## 12. AI Traffic`);
    if (!ga4Connected) {
      ln(`GA4 not connected — no traffic data available.`);
    } else if (trafficSummary) {
      ln(`| Metric | Value |`);
      ln(`|--------|-------|`);
      ln(`| Total AI Sessions | ${trafficSummary.totalSessions} |`);
      ln(`| Total AI Conversions | ${trafficSummary.totalConversions} |`);
      ln(`| Engagement Rate | ${fmt(trafficSummary.engagementRate)}% |`);
      ln();
      ln(`### Traffic by Source`);
      ln(`| Source | Sessions | Conversions |`);
      ln(`|--------|----------|-------------|`);
      for (const t of trafficBySource) {
        ln(`| ${escMd(t.source)} | ${t.sessions} | ${t.conversions} |`);
      }
      ln();
      ln(`### Top Landing Pages`);
      ln(`| Page | Sessions | Engagement |`);
      ln(`|------|----------|------------|`);
      for (const p of topLandingPages) {
        ln(`| ${escMd(p.page)} | ${p.sessions} | ${fmt(p.engagementRate)}% |`);
      }
    }
    ln();
    ln(`---`);
    ln(`*Report generated by Rangefinder Admin. Paste this into an AI assistant for analysis and recommendations.*`);

    const markdown = lines.join('\n');
    const safeName = project.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();

    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="report-${safeName}-${fromDate}-to-${toDate}.md"`,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// ── Helper: visibility data per period ──────────────────────────
async function getVisibilityDataForPeriod(
  db: ReturnType<typeof getDb>,
  projectId: string,
  fromDate: string,
  toDate: string
): Promise<EngineVisibilityInput[]> {
  const citedKeywords = await db
    .select({
      engineType: citations.engineType,
      keywordCount: sql<number>`count(distinct ${citations.keywordId})::int`,
    })
    .from(citations)
    .innerJoin(queryResults, eq(queryResults.id, citations.queryResultId))
    .where(and(
      eq(citations.projectId, projectId),
      eq(citations.isBrandCitation, true),
      gte(citations.createdAt, new Date(fromDate)),
      lte(citations.createdAt, endOfDateRange(toDate))
    ))
    .groupBy(citations.engineType);

  const totalKeywords = await db
    .select({
      engineType: queryResults.engineType,
      keywordCount: sql<number>`count(distinct ${queryResults.keywordId})::int`,
    })
    .from(queryResults)
    .where(and(
      eq(queryResults.projectId, projectId),
      gte(queryResults.createdAt, new Date(fromDate)),
      lte(queryResults.createdAt, endOfDateRange(toDate))
    ))
    .groupBy(queryResults.engineType);

  const citedMap = new Map(citedKeywords.map(c => [c.engineType, c.keywordCount]));
  return totalKeywords.map(t => ({
    engine: t.engineType as EngineType,
    keywordsCited: citedMap.get(t.engineType) || 0,
    totalKeywords: t.keywordCount,
  }));
}
