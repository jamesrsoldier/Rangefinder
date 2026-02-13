import { NextRequest } from 'next/server';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { aiAnalysisRuns, queryRuns, organizations, projects } from '@/lib/db/schema';
import { requireProjectAccess, handleAuthError } from '@/lib/auth/helpers';
import { canUseAiOptimization, getAiAnalysisLimit } from '@/lib/billing/plan-limits';
import { inngest } from '@/lib/inngest/client';
import type { SubscriptionTier } from '@/types';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId);
    const db = getDb();

    // Get org tier for this project
    const [projectOrg] = await db
      .select({
        subscriptionTier: organizations.subscriptionTier,
      })
      .from(projects)
      .innerJoin(organizations, eq(organizations.id, projects.organizationId))
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!projectOrg) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const tier = projectOrg.subscriptionTier as SubscriptionTier;

    // Check tier gating
    if (!canUseAiOptimization(tier)) {
      return Response.json(
        { error: 'AI-powered optimization requires a Starter or Growth plan.' },
        { status: 403 },
      );
    }

    // Check monthly limit
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [usageCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiAnalysisRuns)
      .where(
        and(
          eq(aiAnalysisRuns.projectId, projectId),
          gte(aiAnalysisRuns.createdAt, monthStart),
        ),
      );

    const monthlyLimit = getAiAnalysisLimit(tier);
    if (monthlyLimit > 0 && (usageCount?.count ?? 0) >= monthlyLimit) {
      return Response.json(
        { error: `Monthly AI analysis limit reached (${monthlyLimit}). Resets on the 1st.` },
        { status: 429 },
      );
    }

    // Find the most recent completed query run
    const [latestRun] = await db
      .select({ id: queryRuns.id })
      .from(queryRuns)
      .where(
        and(
          eq(queryRuns.projectId, projectId),
          eq(queryRuns.status, 'completed'),
        ),
      )
      .orderBy(desc(queryRuns.createdAt))
      .limit(1);

    if (!latestRun) {
      return Response.json(
        { error: 'No completed scan found. Run a scan first.' },
        { status: 400 },
      );
    }

    // Create analysis run record
    const [analysisRun] = await db
      .insert(aiAnalysisRuns)
      .values({
        projectId,
        status: 'pending',
      })
      .returning({ id: aiAnalysisRuns.id });

    // Send Inngest event for AI analysis
    await inngest.send({
      name: 'optimization/analyze',
      data: {
        projectId,
        queryRunId: latestRun.id,
        source: 'ai_powered' as const,
      },
    });

    return Response.json({
      analysisRunId: analysisRun.id,
      status: 'pending',
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
