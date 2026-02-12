import { NextRequest } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  trackedKeywords,
  queryRuns,
  organizations,
  projects,
} from '@/lib/db/schema';
import { requireProjectAccess, handleAuthError } from '@/lib/auth/helpers';
import { inngest } from '@/lib/inngest/client';
import { getPlanLimits, canUseEngine } from '@/lib/billing/plan-limits';
import type { EngineType, SubscriptionTier } from '@/types';

/**
 * GET /api/projects/[projectId]/monitoring
 * Returns recent query runs (scan history) for a project.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId);
    const db = getDb();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

    const runs = await db
      .select()
      .from(queryRuns)
      .where(eq(queryRuns.projectId, projectId))
      .orderBy(desc(queryRuns.createdAt))
      .limit(limit);

    return Response.json(
      runs.map((r) => ({
        id: r.id,
        status: r.status,
        engineTypes: r.engineTypes,
        totalKeywords: r.totalKeywords,
        completedKeywords: r.completedKeywords,
        failedKeywords: r.failedKeywords,
        startedAt: r.startedAt?.toISOString() ?? null,
        completedAt: r.completedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/projects/[projectId]/monitoring
 * Manually trigger a monitoring scan for the project.
 * Creates a queryRun and sends the Inngest event.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId);
    const db = getDb();

    // Check for an already running scan
    const [existingRun] = await db
      .select()
      .from(queryRuns)
      .where(
        and(
          eq(queryRuns.projectId, projectId),
          eq(queryRuns.status, 'running')
        )
      )
      .limit(1);

    if (existingRun) {
      return Response.json(
        { error: 'A scan is already running for this project', runId: existingRun.id },
        { status: 409 }
      );
    }

    // Get project + org tier
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, project.organizationId))
      .limit(1);

    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const tier = org.subscriptionTier as SubscriptionTier;
    const limits = getPlanLimits(tier);

    // Get active keywords
    const keywords = await db
      .select({ id: trackedKeywords.id })
      .from(trackedKeywords)
      .where(
        and(
          eq(trackedKeywords.projectId, projectId),
          eq(trackedKeywords.isActive, true)
        )
      );

    if (keywords.length === 0) {
      return Response.json(
        { error: 'No active keywords to scan. Add keywords first.' },
        { status: 400 }
      );
    }

    // Determine available engines for the tier
    const engineTypes = limits.engines.filter((e) => canUseEngine(tier, e));

    // Parse optional body for engine/keyword filtering
    let selectedEngines = engineTypes;
    let selectedKeywordIds = keywords.map((k) => k.id);

    try {
      const body = await request.json();
      if (body.engineTypes && Array.isArray(body.engineTypes)) {
        selectedEngines = body.engineTypes.filter((e: string) =>
          engineTypes.includes(e as EngineType)
        );
      }
      if (body.keywordIds && Array.isArray(body.keywordIds)) {
        const validIds = new Set(keywords.map((k) => k.id));
        selectedKeywordIds = body.keywordIds.filter((id: string) => validIds.has(id));
      }
    } catch {
      // No body or invalid JSON — use defaults (all engines, all keywords)
    }

    if (selectedEngines.length === 0) {
      return Response.json(
        { error: 'No valid engines available for your plan tier.' },
        { status: 400 }
      );
    }

    // Create the queryRun record
    const [run] = await db
      .insert(queryRuns)
      .values({
        projectId,
        status: 'pending',
        engineTypes: selectedEngines as [EngineType, ...EngineType[]],
        totalKeywords: selectedKeywordIds.length,
      })
      .returning();

    // Send the Inngest event to trigger the monitoring pipeline
    await inngest.send({
      name: 'monitoring/run.triggered',
      data: {
        projectId,
        queryRunId: run.id,
        engineTypes: selectedEngines,
        keywordIds: selectedKeywordIds,
      },
    });

    return Response.json(
      {
        id: run.id,
        status: run.status,
        engineTypes: selectedEngines,
        totalKeywords: selectedKeywordIds.length,
        message: 'Monitoring scan triggered successfully.',
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}
