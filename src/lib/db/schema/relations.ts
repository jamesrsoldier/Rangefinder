import { relations } from 'drizzle-orm';

import {
  users,
  organizations,
  organizationMembers,
  projects,
  trackedKeywords,
  queryRuns,
  queryResults,
  citations,
  brandMentions,
  competitors,
  competitorCitations,
  ga4TrafficData,
  gscData,
  alerts,
  alertEvents,
} from './tables';

// ============================================
// USERS & ORGANIZATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  organizationMembers: many(organizationMembers),
  createdOrganizations: many(organizations),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [organizations.createdByUserId],
    references: [users.id],
  }),
  members: many(organizationMembers),
  projects: many(projects),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

// ============================================
// PROJECTS
// ============================================

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  trackedKeywords: many(trackedKeywords),
  queryRuns: many(queryRuns),
  queryResults: many(queryResults),
  citations: many(citations),
  brandMentions: many(brandMentions),
  competitors: many(competitors),
  competitorCitations: many(competitorCitations),
  alerts: many(alerts),
  alertEvents: many(alertEvents),
  ga4TrafficData: many(ga4TrafficData),
  gscData: many(gscData),
}));

// ============================================
// KEYWORDS & MONITORING
// ============================================

export const trackedKeywordsRelations = relations(trackedKeywords, ({ one, many }) => ({
  project: one(projects, {
    fields: [trackedKeywords.projectId],
    references: [projects.id],
  }),
  queryResults: many(queryResults),
  citations: many(citations),
  brandMentions: many(brandMentions),
  competitorCitations: many(competitorCitations),
}));

export const queryRunsRelations = relations(queryRuns, ({ one, many }) => ({
  project: one(projects, {
    fields: [queryRuns.projectId],
    references: [projects.id],
  }),
  queryResults: many(queryResults),
}));

export const queryResultsRelations = relations(queryResults, ({ one, many }) => ({
  queryRun: one(queryRuns, {
    fields: [queryResults.queryRunId],
    references: [queryRuns.id],
  }),
  project: one(projects, {
    fields: [queryResults.projectId],
    references: [projects.id],
  }),
  keyword: one(trackedKeywords, {
    fields: [queryResults.keywordId],
    references: [trackedKeywords.id],
  }),
  citations: many(citations),
  brandMentions: many(brandMentions),
  competitorCitations: many(competitorCitations),
}));

// ============================================
// CITATIONS & BRAND MENTIONS
// ============================================

export const citationsRelations = relations(citations, ({ one }) => ({
  queryResult: one(queryResults, {
    fields: [citations.queryResultId],
    references: [queryResults.id],
  }),
  project: one(projects, {
    fields: [citations.projectId],
    references: [projects.id],
  }),
  keyword: one(trackedKeywords, {
    fields: [citations.keywordId],
    references: [trackedKeywords.id],
  }),
}));

export const brandMentionsRelations = relations(brandMentions, ({ one }) => ({
  queryResult: one(queryResults, {
    fields: [brandMentions.queryResultId],
    references: [queryResults.id],
  }),
  project: one(projects, {
    fields: [brandMentions.projectId],
    references: [projects.id],
  }),
  keyword: one(trackedKeywords, {
    fields: [brandMentions.keywordId],
    references: [trackedKeywords.id],
  }),
}));

// ============================================
// COMPETITORS
// ============================================

export const competitorsRelations = relations(competitors, ({ one, many }) => ({
  project: one(projects, {
    fields: [competitors.projectId],
    references: [projects.id],
  }),
  competitorCitations: many(competitorCitations),
}));

export const competitorCitationsRelations = relations(competitorCitations, ({ one }) => ({
  queryResult: one(queryResults, {
    fields: [competitorCitations.queryResultId],
    references: [queryResults.id],
  }),
  project: one(projects, {
    fields: [competitorCitations.projectId],
    references: [projects.id],
  }),
  competitor: one(competitors, {
    fields: [competitorCitations.competitorId],
    references: [competitors.id],
  }),
  keyword: one(trackedKeywords, {
    fields: [competitorCitations.keywordId],
    references: [trackedKeywords.id],
  }),
}));

// ============================================
// ANALYTICS DATA
// ============================================

export const ga4TrafficDataRelations = relations(ga4TrafficData, ({ one }) => ({
  project: one(projects, {
    fields: [ga4TrafficData.projectId],
    references: [projects.id],
  }),
}));

export const gscDataRelations = relations(gscData, ({ one }) => ({
  project: one(projects, {
    fields: [gscData.projectId],
    references: [projects.id],
  }),
}));

// ============================================
// ALERTS
// ============================================

export const alertsRelations = relations(alerts, ({ one, many }) => ({
  project: one(projects, {
    fields: [alerts.projectId],
    references: [projects.id],
  }),
  alertEvents: many(alertEvents),
}));

export const alertEventsRelations = relations(alertEvents, ({ one }) => ({
  alert: one(alerts, {
    fields: [alertEvents.alertId],
    references: [alerts.id],
  }),
  project: one(projects, {
    fields: [alertEvents.projectId],
    references: [projects.id],
  }),
}));
