import { eq, and, inArray, isNull } from 'drizzle-orm';
import { inngest } from '../client';
import { getDb } from '@/lib/db';
import {
  optimizationRecommendations,
  contentGaps,
  optimizationScores,
} from '@/lib/db/schema';
import { loadAnalysisContext, loadAnalysisData } from '@/lib/optimization/data-loader';
import { analyzeWithRules } from '@/lib/optimization/rule-engine';
import { analyzeWithAi } from '@/lib/optimization/ai-analyzer';
import type { AnalysisResult } from '@/lib/optimization/types';

/**
 * Optimization Analyzer — Inngest Function
 *
 * Triggered by "optimization/analyze" after citation extraction completes.
 * Runs rule-based analysis (automatic after every scan) or AI-powered analysis
 * (manually triggered by user, tier-gated).
 *
 * Steps:
 *   1. load-context — Fetch project + keywords + competitors
 *   2. load-data — Load citation/mention data for this run
 *   3. run-analysis — Execute rule-based or AI analysis
 *   4. expire-stale — Mark old recommendations that no longer apply
 *   5. save-recommendations — Insert new recommendations
 *   6. save-content-gaps — Upsert content gaps
 *   7. save-scores — Store optimization scores
 */
export const optimizationAnalyzer = inngest.createFunction(
  {
    id: 'optimization-analyzer',
    concurrency: { limit: 3 },
    retries: 2,
  },
  { event: 'optimization/analyze' },
  async ({ event, step }) => {
    const { projectId, queryRunId, source } = event.data;
    const db = getDb();

    // Step 1: Load project context
    const context = await step.run('load-context', async () => {
      return loadAnalysisContext(db, projectId, queryRunId);
    });

    // Step 2: Load analysis data
    const analysisData = await step.run('load-data', async () => {
      return loadAnalysisData(db, projectId, queryRunId);
    });

    // Step 3: Run analysis
    const result: AnalysisResult = await step.run('run-analysis', async () => {
      if (source === 'ai_powered') {
        return analyzeWithAi(analysisData, {
          brandName: context.project.brandName,
          brandDomain: context.project.domain,
        });
      }
      return analyzeWithRules(analysisData);
    });

    // Step 4: Expire stale recommendations for this source
    const expiredCount = await step.run('expire-stale', async () => {
      // Get keyword IDs that now have brand citations
      const keywordsNowCited = analysisData.keywordAnalyses
        .filter(ka => ka.hasBrandCitation)
        .map(ka => ka.keywordId);

      if (keywordsNowCited.length === 0) return 0;

      // Expire active recommendations for keywords that now have citations
      const expired = await db
        .update(optimizationRecommendations)
        .set({
          status: 'expired',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(optimizationRecommendations.projectId, projectId),
            eq(optimizationRecommendations.status, 'active'),
            eq(optimizationRecommendations.source, source),
            inArray(optimizationRecommendations.keywordId, keywordsNowCited),
            inArray(optimizationRecommendations.type, ['create_content', 'add_schema']),
          ),
        )
        .returning({ id: optimizationRecommendations.id });

      return expired.length;
    });

    // Step 5: Save new recommendations
    const recsCreated = await step.run('save-recommendations', async () => {
      if (result.recommendations.length === 0) return 0;

      const values = result.recommendations.map(rec => ({
        projectId,
        keywordId: rec.keywordId || null,
        type: rec.type,
        priority: rec.priority,
        status: 'active' as const,
        source: rec.source,
        title: rec.title,
        description: rec.description,
        actionableSteps: rec.actionableSteps,
        estimatedImpact: rec.estimatedImpact,
        targetUrl: rec.targetUrl || null,
        competitorId: rec.competitorId || null,
        metadata: rec.metadata,
        queryRunId,
      }));

      await db.insert(optimizationRecommendations).values(values);
      return values.length;
    });

    // Step 6: Save content gaps (upsert)
    const gapsCreated = await step.run('save-content-gaps', async () => {
      if (result.contentGaps.length === 0) return 0;

      let created = 0;
      for (const gap of result.contentGaps) {
        try {
          if (gap.competitorId) {
            // Standard upsert works when competitorId is non-null
            await db
              .insert(contentGaps)
              .values({
                projectId,
                keywordId: gap.keywordId,
                gapType: gap.gapType,
                competitorId: gap.competitorId,
                competitorUrl: gap.competitorUrl || null,
                engineTypes: gap.engineTypes,
                severity: gap.severity,
                source: gap.source,
                metadata: gap.metadata,
              })
              .onConflictDoUpdate({
                target: [
                  contentGaps.projectId,
                  contentGaps.keywordId,
                  contentGaps.gapType,
                  contentGaps.competitorId,
                ],
                set: {
                  severity: gap.severity,
                  engineTypes: gap.engineTypes,
                  metadata: gap.metadata,
                  updatedAt: new Date(),
                },
              });
          } else {
            // NULL competitorId: PostgreSQL treats NULL != NULL in UNIQUE constraints,
            // so onConflictDoUpdate won't match. Do a manual check-then-upsert.
            const existing = await db
              .select({ id: contentGaps.id })
              .from(contentGaps)
              .where(
                and(
                  eq(contentGaps.projectId, projectId),
                  eq(contentGaps.keywordId, gap.keywordId),
                  eq(contentGaps.gapType, gap.gapType),
                  isNull(contentGaps.competitorId),
                ),
              )
              .limit(1);

            if (existing.length > 0) {
              await db
                .update(contentGaps)
                .set({
                  severity: gap.severity,
                  engineTypes: gap.engineTypes,
                  metadata: gap.metadata,
                  updatedAt: new Date(),
                })
                .where(eq(contentGaps.id, existing[0].id));
            } else {
              await db
                .insert(contentGaps)
                .values({
                  projectId,
                  keywordId: gap.keywordId,
                  gapType: gap.gapType,
                  competitorId: null,
                  competitorUrl: gap.competitorUrl || null,
                  engineTypes: gap.engineTypes,
                  severity: gap.severity,
                  source: gap.source,
                  metadata: gap.metadata,
                });
            }
          }
          created++;
        } catch (error) {
          // Log but continue — individual gap upsert failures shouldn't stop the pipeline
          console.error(`Failed to upsert content gap for keyword ${gap.keywordId}:`, error);
        }
      }
      return created;
    });

    // Step 7: Save optimization scores
    await step.run('save-scores', async () => {
      // Save project-level score (keywordId = null)
      await db.insert(optimizationScores).values({
        projectId,
        keywordId: null,
        overallScore: result.score.overallScore,
        contentCoverage: result.score.contentCoverage,
        competitiveGap: result.score.competitiveGap,
        citationConsistency: result.score.citationConsistency,
        freshness: result.score.freshness,
        queryRunId,
      });
    });

    return {
      projectId,
      queryRunId,
      source,
      recommendationsCreated: recsCreated,
      gapsIdentified: gapsCreated,
      expiredRecommendations: expiredCount,
      score: result.score.overallScore,
    };
  },
);
