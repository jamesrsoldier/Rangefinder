import { PLAN_LIMITS, type SubscriptionTier, type PlanLimits, type EngineType } from '@/types';

export function getPlanLimits(tier: SubscriptionTier): PlanLimits {
  return PLAN_LIMITS[tier];
}

export function canAddKeywords(tier: SubscriptionTier, currentCount: number, adding: number): boolean {
  return currentCount + adding <= PLAN_LIMITS[tier].maxKeywords;
}

export function canAddProject(tier: SubscriptionTier, currentCount: number): boolean {
  return currentCount + 1 <= PLAN_LIMITS[tier].maxProjects;
}

export function canAddCompetitor(tier: SubscriptionTier, currentCount: number): boolean {
  return currentCount + 1 <= PLAN_LIMITS[tier].maxCompetitors;
}

export function canUseEngine(tier: SubscriptionTier, engine: EngineType): boolean {
  return PLAN_LIMITS[tier].engines.includes(engine);
}

export function canUseGA4(tier: SubscriptionTier): boolean {
  return PLAN_LIMITS[tier].ga4Integration;
}

export function canUseGSC(tier: SubscriptionTier): boolean {
  return PLAN_LIMITS[tier].gscIntegration;
}
