import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  users,
  organizations,
  organizationMembers,
  projects,
} from '@/lib/db/schema';

const isMockMode = process.env.USE_MOCK_ENGINE === 'true';
const MOCK_CLERK_ID = 'mock_clerk_user_001';

export interface AuthUser {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean;
}

export interface AuthContext {
  user: AuthUser;
  organizationId: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    createdByUserId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    subscriptionTier: string;
    subscriptionStatus: string;
    trialEndsAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Get the current Clerk user ID.
 * In mock mode, returns a fixed mock user ID without calling Clerk.
 */
async function getClerkUserId(): Promise<string | null> {
  if (isMockMode) {
    return MOCK_CLERK_ID;
  }
  const { auth } = await import('@clerk/nextjs/server');
  const { userId } = await auth();
  return userId;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const clerkId = await getClerkUserId();
  if (!clerkId) return null;

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) return null;

  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isAdmin: user.isAdmin,
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new AuthError('Unauthorized', 401);
  }
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  if (!user.isAdmin) {
    throw new AuthError('Forbidden: admin access required', 403);
  }
  return user;
}

export async function getUserOrganization(userId: string) {
  const db = getDb();
  const [membership] = await db
    .select({
      organizationId: organizationMembers.organizationId,
      role: organizationMembers.role,
      organization: organizations,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, userId))
    .limit(1);

  return membership || null;
}

export async function getOrCreateOrg(userId: string) {
  const membership = await getUserOrganization(userId);
  if (membership) {
    return membership.organization;
  }

  const db = getDb();

  // Look up the user to build a default org name and slug
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new AuthError('User not found', 404);
  }

  const baseName = user.firstName
    ? `${user.firstName}'s Organization`
    : 'My Organization';
  const slug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const uniqueSlug = `${slug}-${user.id.slice(0, 8)}`;

  const [org] = await db
    .insert(organizations)
    .values({
      name: baseName,
      slug: uniqueSlug,
      createdByUserId: userId,
    })
    .returning();

  await db.insert(organizationMembers).values({
    organizationId: org.id,
    userId,
    role: 'owner',
  });

  return org;
}

export async function requireProjectAccess(projectId: string): Promise<AuthContext> {
  const user = await requireAuth();
  const db = getDb();

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    throw new AuthError('Project not found', 404);
  }

  const [membership] = await db
    .select({
      organizationId: organizationMembers.organizationId,
      role: organizationMembers.role,
      organization: organizations,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(
      and(
        eq(organizationMembers.organizationId, project.organizationId),
        eq(organizationMembers.userId, user.id)
      )
    )
    .limit(1);

  if (!membership) {
    throw new AuthError('Forbidden', 403);
  }

  return {
    user,
    organizationId: project.organizationId,
    role: membership.role,
    organization: membership.organization,
  };
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AuthError';
  }

  get status(): number {
    return this.statusCode;
  }
}

export function handleAuthError(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }
  console.error('Unexpected error:', error);
  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
